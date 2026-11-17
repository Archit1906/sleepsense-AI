"""Discrete HMM implemented manually with NumPy (Forward, Backward, Sum-Product, Scaling, Viterbi, MLE)."""
import numpy as np

STATES = ["Awake", "Light Sleep", "Deep Sleep", "REM Sleep"]
SYMS = ["Very Low", "Low", "Moderate", "High", "Very High"]


class HMM:
    def __init__(self, pi, A, B):
        self.pi, self.A, self.B = (np.asarray(x, float) for x in (pi, A, B))
        self.validate()

    def validate(self):
        for name, M in (("pi", self.pi.reshape(1, -1)), ("A", self.A), ("B", self.B)):
            if np.any(M < 0) or not np.allclose(M.sum(axis=1), 1, atol=1e-6):
                raise ValueError(f"{name} must be non-negative and each row must sum to 1")

    def _obs(self, obs):
        obs = np.asarray(obs, int)
        if obs.size == 0:
            raise ValueError("Observation sequence is empty")
        if obs.min() < 0 or obs.max() >= self.B.shape[1]:
            raise ValueError("Observation symbol out of range")
        return obs

    def forward(self, obs):
        """Unscaled alpha_t(i)=P(O1..Ot,St=i); returns (alpha, likelihood)."""
        o = self._obs(obs); T, N = len(o), len(self.pi)
        a = np.zeros((T, N)); a[0] = self.pi * self.B[:, o[0]]
        for t in range(1, T):
            a[t] = self.B[:, o[t]] * (a[t - 1] @ self.A)
        return a, a[-1].sum()

    def backward(self, obs):
        """Unscaled beta_t(i)=P(O_{t+1..T}|St=i)."""
        o = self._obs(obs); T, N = len(o), len(self.pi)
        b = np.ones((T, N))
        for t in range(T - 2, -1, -1):
            b[t] = self.A @ (self.B[:, o[t + 1]] * b[t + 1])
        return b, (self.pi * self.B[:, o[0]] * b[0]).sum()

    def forward_scaled(self, obs):
        """c_t = 1/sum_i alpha_t(i); log P(O) = -sum log c_t."""
        o = self._obs(obs); T, N = len(o), len(self.pi)
        ah = np.zeros((T, N)); c = np.zeros(T); raw = np.zeros((T, N))
        for t in range(T):
            raw[t] = self.pi * self.B[:, o[0]] if t == 0 else self.B[:, o[t]] * (ah[t - 1] @ self.A)
            s = raw[t].sum()
            if s <= 0: raise ValueError("Zero-probability observation under this model")
            c[t] = 1 / s; ah[t] = raw[t] * c[t]
        return ah, c, raw, -np.log(c).sum()

    def backward_scaled(self, obs, c):
        o = self._obs(obs); T, N = len(o), len(self.pi)
        bh = np.ones((T, N))
        for t in range(T - 2, -1, -1):
            bh[t] = c[t + 1] * (self.A @ (self.B[:, o[t + 1]] * bh[t + 1]))
        return bh

    def sum_product(self, obs):
        """Smoothing: gamma = alpha*beta / sum(alpha*beta). Filtering: normalised alpha."""
        ah, c, _, ll = self.forward_scaled(obs)
        bh = self.backward_scaled(obs, c); prod = ah * bh
        return {"gamma": prod / prod.sum(1, keepdims=True), "filtering": ah, "alpha": ah, "beta": bh, "product": prod, "loglik": ll}

    def viterbi(self, obs):
        o = self._obs(obs); T, N = len(o), len(self.pi)
        with np.errstate(divide="ignore"):
            lp, lA, lB = np.log(self.pi), np.log(self.A), np.log(self.B)
        d = np.zeros((T, N)); bp = np.zeros((T, N), int); d[0] = lp + lB[:, o[0]]
        for t in range(1, T):
            sc = d[t - 1][:, None] + lA
            bp[t] = sc.argmax(0); d[t] = sc.max(0) + lB[:, o[t]]
        path = [int(d[-1].argmax())]
        for t in range(T - 1, 0, -1):
            path.append(int(bp[t][path[-1]]))
        return path[::-1], d, bp, float(d[-1].max())

    @staticmethod
    def mle(state_seqs, obs_seqs, N=4, K=5, smoothing=1.0):
        """Supervised MLE with Laplace smoothing using labelled states (NOT Baum-Welch)."""
        pi = np.full(N, smoothing); A = np.full((N, N), smoothing); B = np.full((N, K), smoothing)
        for s, o in zip(state_seqs, obs_seqs):
            pi[s[0]] += 1
            for t in range(len(s)):
                B[s[t], o[t]] += 1
                if t: A[s[t - 1], s[t]] += 1
        return HMM(pi / pi.sum(), A / A.sum(1, keepdims=True), B / B.sum(1, keepdims=True))
