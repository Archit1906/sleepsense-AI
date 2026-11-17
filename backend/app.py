import io, numpy as np, pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS
from algorithms.hmm import HMM, STATES, SYMS
from algorithms.data import simulate, make_ref, discretize, TRUE_A, TRUE_PI

app = Flask(__name__); CORS(app)
train = simulate(3000, seed=7); REF = make_ref(train)
tr_obs = discretize(train, REF); tr_st = train.HiddenState.map(STATES.index).to_numpy()
MODEL = HMM.mle([tr_st], [tr_obs])          # supervised MLE on simulated training data
state = {}


def load(df):
    df = df.copy(); df["ObservationSymbol"] = [SYMS[i] for i in discretize(df, REF)]; state["df"] = df


def reset(): load(simulate(400, seed=42))


reset()


class ApiError(Exception): pass


@app.errorhandler(ApiError)
@app.errorhandler(ValueError)
def err(e): return jsonify(error=str(e)), 400


def ctx():
    j = request.get_json(silent=True) or {}
    m = HMM(MODEL.pi, MODEL.A, MODEL.B)
    if "A" in j:
        A = np.array(j["A"], float)
        if A.shape != (4, 4) or np.any(A < 0) or np.any(A.sum(1) == 0): raise ApiError("Invalid transition matrix")
        m = HMM(m.pi, A / A.sum(1, keepdims=True), m.B)       # normalise rows
    df = state["df"]; n = int(j.get("n", min(len(df), 60)))
    if "observations" in j: obs = [SYMS.index(x) if isinstance(x, str) else int(x) for x in j["observations"]]
    else: obs = discretize(df, REF)[:n].tolist(); 
    if not obs: raise ApiError("Empty observation sequence")
    return m, obs, df.iloc[:len(obs)], j


L = lambda x: np.asarray(x).tolist()
meta = lambda m: dict(states=STATES, symbols=SYMS, pi=L(m.pi), A=L(m.A), B=L(m.B))


@app.get("/api/health")
def health(): return jsonify(status="ok")


@app.get("/api/dataset/sample")
def sample(): return jsonify(records=state["df"].to_dict("records"), stats=state["df"].describe().round(2).to_dict())


@app.post("/api/dataset/reset")
def reset_ep(): reset(); return jsonify(ok=True, rows=len(state["df"]))


@app.post("/api/dataset/upload")
def upload():
    f = request.files.get("file")
    if not f: raise ApiError("No file uploaded")
    method = request.form.get("missing", "mean")
    df = pd.read_csv(io.BytesIO(f.read())); cols = ["MovementIntensity", "HeartRate", "BreathingRate"]
    miss = [c for c in cols if c not in df]
    if miss: raise ApiError(f"Missing required columns: {miss}")
    if "Timestamp" in df and df.Timestamp.duplicated().any(): raise ApiError("Duplicate timestamps found")
    for c in cols: df[c] = pd.to_numeric(df[c], errors="coerce")
    bad = int(df[cols].isna().any(axis=1).sum())
    if method == "drop": df = df.dropna(subset=cols)
    elif method == "median": df[cols] = df[cols].fillna(df[cols].median())
    else: df[cols] = df[cols].fillna(df[cols].mean())
    if df.empty: raise ApiError("No valid rows left")
    if "Timestamp" not in df: df.insert(0, "Timestamp", range(len(df)))
    load(df); return jsonify(rows=len(df), invalid_rows_handled=bad, method=method)


@app.post("/api/sleep/generate")
def generate():
    j = request.get_json(silent=True) or {}
    load(simulate(int(j.get("n", 400)), int(j.get("seed", 42)))); return jsonify(rows=len(state["df"]))


@app.post("/api/hmm/analyze")
def analyze():
    m, obs, df, _ = ctx(); sp = m.sum_product(obs); path, _, _, lp = m.viterbi(obs)
    counts = np.bincount(path, minlength=4); frac = counts / len(path)
    top = int(counts.argmax()); conf = sp["gamma"][np.arange(len(path)), path]
    summary = (f"The HMM estimated that most observations ({frac[top]:.0%}) correspond to {STATES[top]}. "
               + ", ".join(f"{STATES[i]} {frac[i]:.0%}" for i in range(4) if i != top) + ". "
               + f"Mean confidence of the Viterbi path was {conf.mean():.0%}. (Estimated, simulated data; not medical advice.)")
    out = dict(meta(m), observations=obs, path=path, path_names=[STATES[i] for i in path], log_path_prob=lp,
               loglik=sp["loglik"], distribution=dict(zip(STATES, counts.tolist())), minutes=dict(zip(STATES, counts.tolist())),
               gamma=L(sp["gamma"]), confidence=L(conf), summary=summary,
               signals=df[["Timestamp", "MovementIntensity", "HeartRate", "BreathingRate"]].to_dict("records"))
    if "HiddenState" in df: out["reference_accuracy"] = float(np.mean([STATES[p] == r for p, r in zip(path, df.HiddenState)]))
    return jsonify(out)


@app.post("/api/hmm/forward")
def fwd():
    m, o, _, _ = ctx(); a, p = m.forward(o); return jsonify(**meta(m), observations=o, alpha=L(a), likelihood=p)


@app.post("/api/hmm/backward")
def bwd():
    m, o, _, _ = ctx(); b, p = m.backward(o); return jsonify(**meta(m), observations=o, beta=L(b), likelihood=p)


@app.post("/api/hmm/sum-product")
def sp_ep():
    m, o, _, _ = ctx(); r = m.sum_product(o)
    return jsonify(**meta(m), observations=o, gamma=L(r["gamma"]), filtering=L(r["filtering"] / r["filtering"].sum(1, keepdims=True)),
                   product=L(r["product"]), loglik=r["loglik"])


@app.post("/api/hmm/viterbi")
def vit():
    m, o, _, _ = ctx(); path, d, bp, lp = m.viterbi(o)
    return jsonify(**meta(m), observations=o, path=path, path_names=[STATES[i] for i in path],
                   delta_log=np.where(np.isfinite(d), d, None).tolist(), backpointers=L(bp), log_prob=lp)


@app.post("/api/hmm/scaling")
def scal():
    m, o, _, _ = ctx(); ah, c, raw, ll = m.forward_scaled(o)
    try: _, direct = m.forward(o)
    except Exception: direct = None
    return jsonify(**meta(m), observations=o, unscaled_alpha=L(raw), scaling_factors=L(c), scaled_alpha=L(ah),
                   loglik=ll, direct_likelihood=direct, convention="c_t = 1/sum_i alpha_t(i); log P = -sum log c_t")


@app.post("/api/hmm/estimate-parameters")
def est():
    j = request.get_json(silent=True) or {}; k = int(j.get("sequences", 20)); n = int(j.get("length", 100))
    S, O = [], []
    for s in range(k):
        d = simulate(n, seed=1000 + s); S.append(d.HiddenState.map(STATES.index).to_numpy()); O.append(discretize(d, REF))
    e = HMM.mle(S, O, smoothing=float(j.get("smoothing", 1.0)))
    return jsonify(estimated=meta(e), true_pi=L(TRUE_PI), true_A=L(TRUE_A), mean_abs_error_A=float(np.abs(e.A - TRUE_A).mean()),
                   note="Supervised MLE using simulated state labels (not Baum-Welch).")


@app.post("/api/hmm/update-transition")
def upd(): return analyze()


if __name__ == "__main__": app.run(port=5000, debug=True)
