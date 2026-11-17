import numpy as np, pandas as pd
from .hmm import STATES

TRUE_PI = np.array([.7, .25, .03, .02])
TRUE_A = np.array([[.80, .15, .02, .03], [.05, .80, .10, .05], [.02, .12, .85, .01], [.06, .14, .02, .78]])
MU = np.array([[6, 76, 16], [2, 64, 14], [.6, 56, 12.5], [1.5, 68, 15.5]])   # movement, HR, BR
SD = np.array([[2.5, 6, 1.5], [1.2, 5, 1.1], [.5, 4, .9], [1.0, 6.5, 2.0]])  # overlapping on purpose
COLS = ["MovementIntensity", "HeartRate", "BreathingRate"]


def simulate(n=400, seed=42):
    r = np.random.default_rng(seed)
    s = [r.choice(4, p=TRUE_PI)]
    for _ in range(n - 1): s.append(r.choice(4, p=TRUE_A[s[-1]]))
    s = np.array(s); x = np.clip(r.normal(MU[s], SD[s]), 0.01, None)
    return pd.DataFrame({"Timestamp": pd.date_range("2026-01-01 22:00", periods=n, freq="min").astype(str),
                         "MovementIntensity": x[:, 0].round(2), "HeartRate": x[:, 1].round(1),
                         "BreathingRate": x[:, 2].round(1), "HiddenState": [STATES[i] for i in s]})


def _z(df, stats=None):
    X = df[COLS].to_numpy(float)
    stats = stats or (X.mean(0), X.std(0) + 1e-9)
    return ((X - stats[0]) / stats[1]) @ np.array([.6, .25, .15]), stats


def make_ref(df):
    sc, stats = _z(df); return {"stats": stats, "edges": np.quantile(sc, [.2, .4, .6, .8])}


def discretize(df, ref):
    """Weighted z-score activity index -> 5 quantile bins (Very Low..Very High)."""
    return np.digitize(_z(df, ref["stats"])[0], ref["edges"])
