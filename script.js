const PHASES = ["START","DRAW","MAIN","BATTLE","END"]

const state = {
  turn:1,
  phase:"START",
  active:"P1",
  selected:null,

  P1:{ deck:[], hand:[], C:[null,null,null], shield:[] },
  AI:{ deck:[], hand:[], C:[null,null,null], shield:[] }
}

function buildDeck(){
  const deck=[]
  for(let i=1;i<=20;i++){
    deck.push(i)
    deck.push(i)
  }
  return deck.sort(()=>Math.random()-0.5)
}

function startGame(){
  document.getElementById("title").classList.remove("active")
  document.getElementById("game").classList.add("active")

  state.P1.deck=buildDeck()
  state.AI.deck=buildDeck()

  state.P1.shield=[state.P1.deck.pop(),state.P1.deck.pop(),state.P1.deck.pop()]
  state.AI.shield=[state.AI.deck.pop(),state.AI.deck.pop(),state.AI.deck.pop()]

  state.P1.hand=[state.P1.deck.pop(),state.P1.deck.pop(),state.P1.deck.pop(),state.P1.deck.pop()]
  state.AI.hand=[state.AI.deck.pop(),state.AI.deck.pop(),state.AI.deck.pop(),state.AI.deck.pop()]

  render()
}

function render(){
  document.getElementById("turnInfo").innerText="TURN "+state.turn
  document.getElementById("phaseInfo").innerText=state.phase
  document.getElementById("activeInfo").innerText=
    state.active==="P1"?"YOUR TURN":"ENEMY TURN"

  renderHand()
  renderZones()
}

function renderHand(){
  const hand=document.getElementById("hand")
  hand.innerHTML=""
  if(state.active!=="P1") return

  state.P1.hand.forEach((c,i)=>{
    const div=document.createElement("div")
    div.className="card"
    div.innerText="Card "+c
    div.onclick=()=>{ state.selected=i; render() }
    hand.appendChild(div)
  })
}

function renderZones(){

  const pC=document.getElementById("pC")
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

  renderShield("pShield",state.P1.shield)
  renderShield("aiShield",state.AI.shield,true)
}

function renderShield(id,arr,enemy=false){
  const zone=document.getElementById(id)
  zone.innerHTML=""

  arr.forEach(()=>{
    const back=document.createElement("div")
    back.className="card"
    back.style.background="#000"
    back.style.border="2px solid #999"
    zone.appendChild(back)
  })
}

function nextPhase(){
  let i=PHASES.indexOf(state.phase)
  state.phase=PHASES[(i+1)%PHASES.length]

  if(state.phase==="DRAW"){
    if(state.active==="P1"){
      state.P1.hand.push(state.P1.deck.pop())
    }
  }

  render()
}

function endTurn(){
  if(state.active==="P1"){
    state.active="AI"
    runAI()
  }else{
    state.active="P1"
  }

  state.turn++
  state.phase="START"
  render()
}

function runAI(){

  setTimeout(()=>{
    state.AI.hand.push(state.AI.deck.pop())

    const empty=state.AI.C.findIndex(x=>!x)
    if(empty!==-1 && state.AI.hand.length){
      state.AI.C[empty]=state.AI.hand.pop()
    }

    if(state.P1.shield.length){
      state.P1.shield.pop()
      state.P1.hand.push("ShieldCard")
    }

    state.active="P1"
    state.turn++
    state.phase="START"
    render()

  },800)
}

document.getElementById("startBtn").onclick=startGame
document.getElementById("nextBtn").onclick=nextPhase
document.getElementById("endBtn").onclick=endTurn