import unittest, numpy as np
from algorithms.hmm import HMM

class T(unittest.TestCase):
    def setUp(self):
        self.m = HMM([.6, .4], [[.7, .3], [.4, .6]], [[.5, .5], [.1, .9]]); self.o = [0, 1, 1, 0]
    def test_forward_backward_equal(self):
        self.assertAlmostEqual(self.m.forward(self.o)[1], self.m.backward(self.o)[1])
    def test_known_likelihood(self):  # brute force over all 16 paths
        import itertools; m, o = self.m, self.o; tot = 0
        for s in itertools.product(range(2), repeat=4):
            p = m.pi[s[0]] * m.B[s[0], o[0]]
            for t in range(1, 4): p *= m.A[s[t-1], s[t]] * m.B[s[t], o[t]]
            tot += p
        self.assertAlmostEqual(m.forward(o)[1], tot)
    def test_gamma_sums_to_one(self):
        self.assertTrue(np.allclose(self.m.sum_product(self.o)["gamma"].sum(1), 1))
    def test_viterbi_matches_bruteforce(self):
        import itertools; m, o = self.m, self.o; best = (0, None)
        for s in itertools.product(range(2), repeat=4):
            p = m.pi[s[0]] * m.B[s[0], o[0]]
            for t in range(1, 4): p *= m.A[s[t-1], s[t]] * m.B[s[t], o[t]]
            best = max(best, (p, s))
        path, _, _, lp = m.viterbi(o); self.assertEqual(tuple(path), best[1]); self.assertAlmostEqual(np.exp(lp), best[0])
    def test_scaling(self):
        _, c, _, ll = self.m.forward_scaled(self.o); self.assertAlmostEqual(ll, np.log(self.m.forward(self.o)[1]))
    def test_long_sequence_no_underflow(self):
        o = [0, 1] * 2000; self.assertTrue(np.isfinite(self.m.forward_scaled(o)[3]))
    def test_mle(self):
        m = HMM.mle([[0, 0, 1, 1, 0]], [[0, 1, 1, 0, 0]], N=2, K=2, smoothing=0); self.assertAlmostEqual(m.A[0, 1], .5)
    def test_invalid(self):
        with self.assertRaises(ValueError): HMM([.5, .6], [[1, 0], [0, 1]], [[1, 0], [0, 1]])
if __name__ == "__main__": unittest.main()
