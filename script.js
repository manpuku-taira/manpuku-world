const PHASES = ["START","DRAW","MAIN","BATTLE","END"]

const state = {
  turn:1,
  phase:"START",
  active:"P1",
  selected:null,
  P1:{ hand:[], C:[null,null,null], shield:[1,1,1] },
  AI:{ hand:[], C:[null,null,null], shield:[1,1,1] }
}

function startGame(){
  document.getElementById("title").classList.remove("active")
  document.getElementById("game").classList.add("active")

  state.P1.hand = [1,2,3,4]
  render()
}

function render(){

  document.getElementById("turnInfo").innerText = "TURN "+state.turn
  document.getElementById("phaseInfo").innerText = state.phase
  document.getElementById("activeInfo").innerText =
    state.active==="P1"?"YOUR TURN":"ENEMY TURN"

  renderHand()
  renderZones()
}

function renderHand(){
  const hand = document.getElementById("hand")
  hand.innerHTML = ""

  state.P1.hand.forEach((c,i)=>{
    const div = document.createElement("div")
    div.className="card"
    div.innerText="Card "+c
    div.onclick=()=>{
      state.selected=i
      render()
    }
    hand.appendChild(div)
  })
}

function renderZones(){

  const pC = document.getElementById("pC")
  pC.innerHTML=""

  for(let i=0;i<3;i++){
    const slot=document.createElement("div")
    slot.className="slot"
    slot.onclick=()=>{
      if(state.phase==="MAIN" && state.selected!==null){
        state.P1.C[i]=state.P1.hand.splice(state.selected,1)[0]
        state.selected=null
        render()
      }
    }

    if(state.P1.C[i]){
      const card=document.createElement("div")
      card.className="card"
      card.innerText="Card "+state.P1.C[i]
      slot.appendChild(card)
    }

    pC.appendChild(slot)
  }

  const aiC=document.getElementById("aiC")
  aiC.innerHTML=""
  for(let i=0;i<3;i++){
    const slot=document.createElement("div")
    slot.className="slot"
    if(state.AI.C[i]){
      const card=document.createElement("div")
      card.className="card"
      card.innerText="AI"
      slot.appendChild(card)
    }
    aiC.appendChild(slot)
  }
}

function nextPhase(){
  let i = PHASES.indexOf(state.phase)
  state.phase = PHASES[(i+1)%PHASES.length]
  render()
}

function endTurn(){
  state.active = state.active==="P1"?"AI":"P1"
  state.turn++
  state.phase="START"
  render()
}

document.getElementById("startBtn").onclick=startGame
document.getElementById("nextBtn").onclick=nextPhase
document.getElementById("endBtn").onclick=endTurn