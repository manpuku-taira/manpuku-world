const titleScreen = document.getElementById("titleScreen");
const gameScreen = document.getElementById("gameScreen");
const attackBtn = document.getElementById("attackBtn");

// タイトル画面タップでゲーム開始
titleScreen.addEventListener("click", () => {
  titleScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  playStartEffect();
});

// 攻撃ボタン演出
attackBtn.addEventListener("click", () => {
  attackEffect();
});

// 簡易開始エフェクト
function playStartEffect() {
  const flash = document.createElement("div");
  flash.style.position = "fixed";
  flash.style.top = 0;
  flash.style.left = 0;
  flash.style.width = "100%";
  flash.style.height = "100%";
  flash.style.background = "white";
  flash.style.opacity = "0.8";
  flash.style.zIndex = "999";
  document.body.appendChild(flash);

  setTimeout(() => {
    flash.remove();
  }, 200);
}

// 攻撃エフェクト
function attackEffect() {
  const effect = document.createElement("div");
  effect.innerText = "⚡ ATTACK ⚡";
  effect.style.position = "absolute";
  effect.style.top = "50%";
  effect.style.left = "50%";
  effect.style.transform = "translate(-50%, -50%)";
  effect.style.fontSize = "2rem";
  effect.style.color = "#ff00c8";
  effect.style.textShadow = "0 0 20px #ff00c8";
  effect.style.zIndex = "1000";
  document.body.appendChild(effect);

  setTimeout(() => {
    effect.remove();
  }, 800);
}
