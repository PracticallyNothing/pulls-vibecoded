// The plugin's own UI, in a shadow root so Instagram's CSS can't touch it.
// Every interactive element carries data-pulls=<name> for tests.

const CSS = `
  :host { all: initial; }
  * { box-sizing: border-box; font: 15px/1.4 system-ui, sans-serif; }
  [hidden] { display: none !important; }
  .gate {
    position: fixed; inset: 0; z-index: 2147483646;
    background: #111; color: #eee;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px;
  }
  .panel {
    position: fixed; left: 50%; bottom: 16px; transform: translateX(-50%); z-index: 2147483647;
    display: flex; align-items: center; gap: 12px;
    background: #222d; color: #eee; padding: 8px 12px; border-radius: 999px;
  }
  .confirm {
    position: fixed; inset: 0; z-index: 2147483647; background: #000a;
    display: flex; align-items: center; justify-content: center;
  }
  .dialog { background: #222; color: #eee; padding: 20px; border-radius: 12px; display: grid; gap: 16px; }
  .row { display: flex; gap: 12px; justify-content: flex-end; }
  button {
    background: #444; color: #eee; border: 0; border-radius: 999px; padding: 10px 18px; cursor: pointer;
  }
  button:disabled { opacity: 0.4; cursor: default; }
  button.primary { background: #3a6; }
  .muted { color: #999; font-size: 13px; }
`;

const HTML = `
  <div class="gate" data-pulls="gate" hidden>
    <div><span data-pulls="left"></span> pulls left today</div>
    <button class="primary" data-pulls="pull">Pull</button>
    <div class="muted">Resets at 08:00</div>
  </div>
  <div class="panel" data-pulls="panel" hidden>
    <button data-pulls="prev" aria-label="Previous pull">‹</button>
    <span><span data-pulls="left"></span> left</span>
    <button data-pulls="next" aria-label="Next">›</button>
  </div>
  <div class="confirm" data-pulls="confirm" hidden>
    <div class="dialog" role="dialog">
      <div>Use 1 of <span data-pulls="left"></span> pulls?</div>
      <div class="row"></div>
    </div>
  </div>
`;

export function createUi({ onPrev, onNext, onPull }) {
  const host = document.createElement("pulls-ui");
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `<style>${CSS}</style>${HTML}`;
  const $ = name => root.querySelector(`[data-pulls=${name}]`);

  let confirmResolve = null;
  const closeConfirm = answer => {
    $("confirm").hidden = true;
    $("confirm").querySelector(".row").replaceChildren(); // removed while closed
    confirmResolve?.(answer);
    confirmResolve = null;
  };

  $("prev").onclick = onPrev;
  $("next").onclick = onNext;
  $("pull").onclick = onPull;

  return {
    mount() {
      if (!host.isConnected) document.documentElement.append(host);
    },
    render({ gate, panel, left, canPrev, canNext }) {
      $("gate").hidden = !gate;
      $("panel").hidden = !panel;
      for (const el of root.querySelectorAll("[data-pulls=left]")) el.textContent = String(left);
      $("pull").disabled = left <= 0;
      $("prev").disabled = !canPrev;
      $("next").disabled = !canNext;
    },
    // Resolves true on Accept, false on Cancel.
    confirm() {
      const row = $("confirm").querySelector(".row");
      const cancel = document.createElement("button");
      cancel.dataset.pulls = "cancel";
      cancel.textContent = "Cancel";
      cancel.onclick = () => closeConfirm(false);
      const accept = document.createElement("button");
      accept.dataset.pulls = "accept";
      accept.className = "primary";
      accept.textContent = "Accept";
      accept.onclick = () => closeConfirm(true);
      row.replaceChildren(cancel, accept);
      $("confirm").hidden = false;
      return new Promise(r => (confirmResolve = r));
    },
  };
}
