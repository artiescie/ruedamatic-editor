/* eslint-disable */
// Combos and perms - our special use of the words
// "Combo" here is basically the (mermaid.js) simple tree of possible combinations where all nodes are moves
// "Perm" is any single path through the tree to an end node
// We generate all the perms possible, then iterate throough them doing our "match" tests
// okPerms array will hold the Perms that pass the test, for the given song and index into the song beats

// TIPS for autofill:
//   EXTENDABLE moves
//    - used as the basic main tool of "dancing to the music"
//    - extendable moves have a setupbars field
//    - algorithm fills the song one PERM at a time
//    - within 1 PERM, a move PRECEDING an extendable will try to "borrow" the setupbars
//    - effect: the music "shift" will try to hit the repetitive part of the extendable move, the setup part has already happened
//    - EFFECTS ON DESIGN:
//       - TREE: before an extendable, provide paths of different lengths to reach the extendable
//       - BEATS: (any tips?)
//   GUAPEA or other BASIC moves
//       - these moves are the only ones marked LEVEL 1.
//       - autofill will NOT choose a path where level 1 move hits a shift

// for us in rm-spot project, currently enforcing SEMICOLONS,
//  to disable that for the file: try some version of this using the rule as named:
//  /* eslint-disable no-use-before-define */

// re RANDOM selection:
//   builtin Math.random could be suspected of not-random-enough
//   An alternative is discuessed here: https://stackoverflow.com/questions/521295/seeding-the-random-number-generator-in-javascript

import _cloneDeep from 'lodash/cloneDeep'
import _sortBy from 'lodash/sortBy'

let songShifts = null

// make a binary search available on the Array type
//  https://stackoverflow.com/questions/37711682/javascript-lodash-binary-search-by-function
// eslint-disable-next-line no-extend-native
Array.prototype.binarySearchIndex = function (val, cb = x => x) { // default callback for primitive arrays
  const valLower = val.toLocaleLowerCase()
  let deli = this.length - 1 // delta index
  let base = 0 // base to add the delta index
  while (deli > 0 && cb(this[base + deli]) !== valLower) {
    deli = ~~(deli / 2)
    cb(this[base + deli]) < valLower && (base += deli)
  }
  return cb(this[base + deli]) === valLower ? base + deli : -1
}

const cleanbool = (val) => {
  let ret = false
  if (typeof val === 'string') {
    if (val === 'true') ret = true
  }
  if (typeof val === 'boolean') {
    ret = val
  }
  return ret
}

class AutoFiller {
  constructor(seqEdited,
    editedMoves,
    editedCombos,
    lstTimesWork,
    currentBeatIndex = null,
    fixWebData = false // when RMspot calls, send TRUE here
  ) {
    // main program data structures via constructor
    this.lstSeqEdited = seqEdited // when autofill is called, we will empty this array and fill it from scratch
    this.editedMoves = fixWebData ? this.adaptorFromRMSMoves(editedMoves) : editedMoves
    this.editedCombos = fixWebData ? this.adaptorFromRMSCombos(editedCombos) : editedCombos
    this.lstTimesAndGears = lstTimesWork // this is likely modified in genOkPerms - cleanGears: cleaned up for autoplay
    // main work we do for the calling program
    this.okPerms = [] // all "permutations" of the combo that pass our tests, to fit the musicality of the given song
    this.numAllPerms = 0 // all "permutations" of the combo that pass our tests, to fit the musicality of the given song
    this.modTimesAndGears = [] // TODO: needed? modified version of lstTimesAndGears after genOkPerms
    // control parameters from constructor
    this.currentBeatIndex = currentBeatIndex // beat index into lstTimesAndGears
    // these will likely be temporary
    this.selPermIndex = 0 // after user selects (in one old use case)
    this.passCount = -1 // reports the loop in shifter.check routine where a perm was selected
    this.aryFillSpots = []
    // transform data so web app can use the AutoFiller created for the PC App


    // we lookup our special Clave Switch moves, which ar not user-chosen
    //  NOTICE we use the raw data, before the fixWebData above!
    const mvCruceIndex = this.editedMoves.binarySearchIndex('Cruce', mv => mv.$.nameSorted)
    const mvFotoIndex = this.editedMoves.binarySearchIndex('Foto', mv => mv.$.nameSorted)
    const mvContinueIndex = this.editedMoves.binarySearchIndex('Continue', mv => mv.$.nameSorted)
    if (mvCruceIndex < 0) {
      console.error('Cruce move was not found (needed for a short (1/2) measure)')
    } else {
      this.moveCruce = {
          move: this.editedMoves[mvCruceIndex].$.name,
          length: parseInt(this.editedMoves[mvCruceIndex].$.length),
          lengthextendable: false,
          level: parseInt(this.editedMoves[mvCruceIndex].$.level),
          setupbars: 0
      }
    }
    if (mvFotoIndex < 0) {
      console.error('Foto move was not found (needed for a short (3/4) measure)')
    } else {
      this.moveFoto = {
          move: this.editedMoves[mvFotoIndex].$.name,
          length: parseInt(this.editedMoves[mvFotoIndex].$.length),
          lengthextendable: false,
          level: parseInt(this.editedMoves[mvFotoIndex].$.level),
          setupbars: 0
      }
    }
  }

  producePermutations (item) {
    const that = this
    // only a helper for genOkPerms
    // here, all possible permutations are generated
    // later, they will be filtered to fit the free space and maybe gears in the song

    // https://stackoverflow.com/questions/12303989/cartesian-product-of-multiple-arrays-in-javascript
    // produces cartesian product of possible permutations
    const cartesianHelper = (a, b) => [].concat(...a.map(a => b.map(b => [].concat(a, b))))
    const cartesian = (a, b, ...c) => b ? cartesian(cartesianHelper(a, b), ...c) : a

    // Out of all the possibilities, paths and durations, select specific moves etc.
    this.currCbo = _cloneDeep(this.editedCombos[item.$.name]) // we have to clone things where we want diff versions of state
    // traverse the combo tree, and keep track of the move sequences it contains
    let seqCurr = [] // (repeatedly) accumulates moves and extra beats [{move: moveName, extra: nBeats}]
    const seqCurrWrapper = {} // accum one sequence based on this combo {id:, length:, weight:, moves: [{name:, length:}, ...]}
    seqCurrWrapper.hdr = {}
    seqCurrWrapper.moves = []

    const colSeq = {} // accum all sequences based on this combo {comboName:'', gears:[], combs: [{weight:, move: [{name:, length:}, ...]}]
    colSeq.hdr = { baseCombo: '', min: 0, max: 0, gears: [] }
    colSeq.products = []

    let weightCurr = 1

    const arrBranchTrail = [] // used to track unvisited branches
    let errMsg = '' // possible string for later
    // first node, Start node... should only have one child
    let currNode = { branch: 'node2', parent: this.currCbo.nodes.node1 } // always the real first move, no siblings
    // loop over the nodes
    while (currNode) { // break to exit loop
      const myMove = this.currCbo.nodes[currNode.branch]
      let localNodeEditTextWithoutMinMax
      let localNodeEditExtraTimeMin
      let localNodeEditExtraTimeMax
      const origText = this.stripOuterQuotes(myMove.text)
      // get the actual move, separate the extra time if any
      // regex pulls out 'Guapea' '2' and '4' from 'Guapea [2-4]'
      const match = /^["]?(.*) +\[([0-9])-([0-9])\]( *)?["]?$/g.exec(origText) // assume at least a single space between move and min-max
      try {
        localNodeEditTextWithoutMinMax = match[1]
        localNodeEditExtraTimeMin = parseInt(match[2])
        localNodeEditExtraTimeMax = parseInt(match[3])
      } catch (e) {
        // match fails: there is no extra time field, the whole text field is just the move name
        localNodeEditTextWithoutMinMax = origText
        localNodeEditExtraTimeMin = 0
        localNodeEditExtraTimeMax = 0
      }
      // got name, and extra time: now let's get the move length itself
      const moveIndex = that.editedMoves.binarySearchIndex(localNodeEditTextWithoutMinMax, m => m.$.nameSorted)
      // moveLength, setupbars :
      // these fields are used only in the autofill calculations.
      //   Are entirely derived from the Move fields.
      //   We retrieve them at runtime just for the calculation -- not saved with the combo
      let moveLength, setupbars, lengthextendable, level
      try {
        moveLength = parseInt(this.editedMoves[moveIndex].$.length)
        level = parseInt(this.editedMoves[moveIndex].$.level) || 6
        setupbars = parseInt(this.editedMoves[moveIndex].$.setupbars || 0) // avoid NaN which isn't parsed to 0
        lengthextendable = cleanbool(this.editedMoves[moveIndex].$.lengthextendable) // avoid NaN which isn't parsed to 0
      } catch (e) {
        debugger
        errMsg = 'Illegal move in combo: ' + item.name + ', move: ' + localNodeEditTextWithoutMinMax
        console.error(errMsg)
        // this.$bvToast.toast(errMsg, { title: 'Error' })
        throw (e)
      }
      if (localNodeEditExtraTimeMax) { // if there is a length range
        const moveCurr = []
        for (let xBeats = localNodeEditExtraTimeMin; xBeats <= localNodeEditExtraTimeMax; xBeats++) {
          moveCurr.push({ move: localNodeEditTextWithoutMinMax, length: moveLength + xBeats, upshift: myMove.allowUpshift, setupbars: setupbars, lengthextendable: lengthextendable, level: level })
        }
        seqCurr.push(moveCurr)
      } else { // or  // if there is no length range: just the bare move length
        seqCurr.push([{ move: localNodeEditTextWithoutMinMax, length: moveLength, upshift: myMove.allowUpshift, setupbars: setupbars, lengthextendable: lengthextendable, level: level }])
      }

      // DISCOVER BRANCHES: links discovered here, to be visited in future
      if (myMove.next && myMove.next.length > 0) {
        // are there explicit weights associated?
        const weights = []
        if (myMove.link && myMove.link.length > 0) {
          // iterate?
          let total = 0
          for (let i = 0; i < myMove.link.length; i++) {
            // get total, then we can adjust to < 1.00 probability
            // regex pulls the 5 out of '-- 5 -->'
            const raw = parseInt(/^[- ]*([a-zA-Z0-9]*)+[ ->]*$/g.exec(myMove.link[i])[1])
            total += raw
            weights.push(raw)
          }
          for (let i = 0; i < weights.length; i++) {
            // now adjust to < 1.00 probability
            weights[i] /= total
          }
        } else {
          // set implicit (even) weights if more than 1 next option
          for (let i = 0; i < myMove.next.length; i++) {
            weights.push(1.0 / myMove.next.length)
          }
        }
        // add any new branches discovered
        arrBranchTrail.push(...myMove.next.map((n, idx) => {
          // update the parent
          const cloneMove = _cloneDeep(myMove) // freeze the sequence state - it is NOT shared with other parts of the graph
          cloneMove.seqAccum = _cloneDeep(seqCurr)
          return { branch: n, parent: cloneMove, weight: weightCurr * weights[idx] }
        }))
      } else {
        // END of a sequence
        // wrap it and stash it
        seqCurrWrapper.hdr = {} // accum one sequence based on this combo {id:, length:, weight:, moves: [{name:, length:}, ...]}
        seqCurrWrapper.moves = []
        let normSeqCurr = cartesian(...seqCurr)
        if (!Array.isArray(normSeqCurr[0])) {
          normSeqCurr = normSeqCurr.map(mv => [mv])
          console.log('Single move in combo, normalize to an array!')
          // // this.$bvToast.toast('Selected Combo is incomplete or invalid, please check!', { title: 'Error' })
          // return
        }
        normSeqCurr.forEach(s => {
          const comboLen = s.reduce((acc, cval) => acc + cval.length, 0)
          // let's pack some info in the id field: shorthand for what it contains
          const comboId = s.map(m => m.move.substr(0, 3) + (m.upshift ? '🔥' : '') + m.length).join('').replace(' ', '') + '-' + comboLen
          seqCurrWrapper.hdr = {}
          seqCurrWrapper.hdr = { id: comboId, length: comboLen, weight: weightCurr / normSeqCurr.length }
          seqCurrWrapper.moves = []
          seqCurrWrapper.moves.push(_cloneDeep(s))
          colSeq.products.push(_cloneDeep(seqCurrWrapper))
          colSeq.hdr.min = parseInt(this.currCbo.$.minLength)
          colSeq.hdr.max = parseInt(this.currCbo.$.maxLength)
          colSeq.hdr.baseCombo = this.currCbo.$.name
          colSeq.hdr.gears = this.currCbo.$.gears
        })
      }
      // NEXT NODE, prepare for the WHILE loop: set currNode
      // console.log(currNode.branch, JSON.stringify(arrBranchTrail.map(b => b.branch)))
      if (arrBranchTrail.length > 0) {
        currNode = arrBranchTrail.pop() // obj like {choice: 'node9', parent: ....}
        // here we reuse the parents max-min calculated previously,
        // since it is the accum min/max to this branching point,
        // it represents our starting min/max as we follow a different branch from the same node
        seqCurr = currNode.parent.seqAccum // TODO: build this
        weightCurr = currNode.weight
      } else {
        currNode = null // breaks // loop is done: set results
      }
    }
    return colSeq
  }

  getShifts (maxBeats) {
    // genOkPerms helper.
    // Song check: find the gear shifts in the song
    //  maxBeats is the longest perm, no need to look farther in the song
    const that = this
    const findNextMove = function (iStart) {
      let max = 0
      for (let i = iStart; i < that.lstTimesAndGears.length; i++) {
        max = i - iStart
        if (that.lstSeqEdited[i] || 'cambio' === that.lstTimesAndGears[i].gear) {
          // if there's a move already in range
          //  stop before we hit it
          break
        }
      }
      // if we got to the end, add 1 for the last ite,
      return max + 1
    }
    // return a profile of the length of the largest perm
    // it has an ordered array of objects {pos: n, gear: 'string'}
    // if there's already a move in the seq ahead... we won't overwrite it... look for one here:
    const maxClear = findNextMove(this.currentBeatIndex)
    const lim = maxClear < maxBeats ? maxClear : maxBeats
    const colShifts = []
    for (let ptr = this.currentBeatIndex; ptr < (lim + this.currentBeatIndex); ptr++) {
      let curGear
      try {
        curGear = this.lstTimesAndGears[ptr].gear
      } catch (error) {
        console.log('getShifts - exceeded end of beats, check value of limit "lim"')
        // debugger
      }
      // if we pre-arrange that cambio gear is already assigned the Medio move in sequence...
      //   THEN we can REMOVE this entire conditional
      if (curGear === 'cambio') {
        if (ptr > this.currentBeatIndex) {
          // cambio will mark the end of 1 fill operation
          colShifts.push({ pos: ptr - this.currentBeatIndex, gear: 'stop' })
          return colShifts
        }
        // break
      }
      if (ptr > 0) {
        if (curGear === 'refresh' || curGear === 'climax' || curGear === 'spicy') {
          if (ptr > this.lstTimesAndGears[ptr - 1].gear !== curGear) {
            if (ptr > this.currentBeatIndex) {
              colShifts.push({ pos: ptr - this.currentBeatIndex, gear: curGear })
            }
            }
          }
      }
    }
    // last item in arr will be just the available space for perm
    //  either the last beat before we run into pre-existing calls
    //    or, if no existing calls are in the way, then the end of the song
    colShifts.push({ pos: lim, gear: 'stop' })
    return colShifts
  }

  genOkPerms (cboHdr) {
    // The AutoFiller sequence for the player is NOT actually changed, but the raw data is prepared here
    // We assess each perm if the param Combo, against the song beats (gears) using our rules
    //   We also pick one at random
    //  The values are stored at:
    //     this.okPerms
    //     this.selPermIndex
    // **  This info is used by autoFill routine to set the player move sequence
    const that = this // for use in some nested scopes

    this.okPerms = [] // for all the perms that PASS THESE TESTS
    this.selPermIndex = -1 // invalid sentinel value

    let audit = '' // the audit can surface the reason for rejecting a perm, so far not used.
    const timeStart = new Date() // for runtime profiling

    // songShifts is going to be at least 1 length: the (artificial) stop shift, at the end
    songShifts = this.getShifts(parseInt(cboHdr.$.maxLength)) // (gear, position)
    const maxLength = songShifts.pop().pos // REMOVE the stop pos from songShifts, KEEP it in maxLength

    // producePermutations generate all possible combo "permutations"
    // and then filter ones whose move gears conincide with the song's gears
    const perms = this.producePermutations(cboHdr)
    this.numAllPerms = perms.products.length
    // prep: look through perms: are there any (more than zero) that have
    //  marked a move as "upshift"?  If so, save a flag.  When we filter eligible perms
    //  we will select ONLY those that match a climax/spicy bar in the songShifts
    // console.log('perms: ' + JSON.stringify(perms.products.length))
    // maxLength we check is the length allowed to end of song; or (if later moves exist already) just to the next move
    console.log('songShifts: ' + JSON.stringify(songShifts) + ', maxLength: ' + maxLength)
    // filter every perm for matching the songShifts

    // Step thrgough ALL PERMUTATIONS
    //   ...and passing ones that have SHIFTs matching SHIFTS in the song
    //   WHY? we are trying to maximize musicality of the calls
    //       where? look in the shifter check method
    //  STRATEGY
    //  2 loops are possible based on "passcount" var
    //    1st loop is more strict: it insists that if a song has shift marked as SPICY/CLIMAX that a move marked
    const timeToFilter = new Date() // for runtime profiling
    //  - first pass (passCount == 0) forces matching upshift moveNext to a songshift of climax / spicy
    //  - second pass (passCount == 1) could ease off on requiring NO GUAPEA for a move on a shift

    let perm // the "perm" we are currently evaulating
    for (let j = 0; j < perms.products.length; j++) {
      perm = perms.products[j]
      // NOW accept or reject the perm
      if (perm.hdr.length > maxLength) {
        audit = 'NO ROOM for this perm at position - ' + this.currentBeatIndex
        break // *** BAIL *** not enough space
      }
      // passCount 0: upshift in perm REQUIRES upshift in song
      // passCount 1: accept a refresh shift as a match (second pass allows mismatch)
      // TODO: do we know perm.moves is always a non-empty array ?
      // all the moves of the perm are at perm.moves[0], due to conversion process

      // stateful helper screener

      const screener = {
        accBeats: 0,
        borrowBeats: 0,
        // these values from shifter sub-object
        // hitShift: null,
        // missedShifts: [], // gets value from shifter sub-object
        check: function (moveCurr, moveNext, movePrev, songShifts, that) {
          // last arg that is a ref to the AutoFiller object
          let audit = ''
          let res = false
          // screener computes the beats accumulator
          // AND calls the shifter
          // AND returns the shifter's return value
          //   telling the caller if move is

          // arg1 always a new move.  ...rest of args may be nulls or objects

          // setupbars are "borrowed", deducted from previous beat length
          //  so that the setup is compplete before the coming beat
          //  This generally gives the desired effect of the move kicking in at the right time.
          //  "borrowbeats" can be > 0 on next line... only if there was a PREVIOUS move to "borrow" from
          //    ...not at the 1st move of a perm

          // moveCurr begins somewhere BEFORE the shiftIdx we will be considering -- moveNext is the one that will be placed next
          this.accBeats += (moveCurr.length - this.borrowBeats)
          this.borrowBeats = 0 // clear for next move

          // here's where borrowbeats picks up its value
          if (moveNext && moveNext.setupbars) this.borrowBeats = moveNext.setupbars || 0
          this.accBeats += this.borrowBeats
          ;[res, audit] = this.shifter.check(this.accBeats, moveCurr, moveNext, songShifts, that)
          return [res, audit] // true or false
        },
        shifter: {
          // shifter loops through all the song shifts
          // AND evals and returns the states [ok-so-far|misfit] (true|false)
          shiftIdx: 0,
          missedShifts: [],
          hitShift: null, // if accumulated beats hits a shift right on, we will return the shift object
          check: function (accBeats, moveCurr, moveNext, songShifts, that) {
            // last arg that is a ref to the AutoFiller object
            // ret true: ok so far, keep going | false: misfit, discard the parm
            this.missedShifts = [] // start clean
            this.hitShift = null
            let audit = '' // clear for next pass
            while (true) { // RETURN is the only exit we use
              // we are looping though the moves of a perm
              //   and manually stepping through the songshifts
              //   to filter out incompatible "perms"
              // THERE ARE 3 states as we step through here:
              //  MISSED A SHIFT:
              //    passCount 0 or 1: OK if moveCurr is lengthextendable and not level 1
              //
              //  DIRECT HIT ON A SHIFT
              //    passCount 0: OK
              //       if NOT level === 1
              //         if climax/spicy UPSHIFT is matched by UPSHIFT moveNext from the perm
              //           OR
              //         if moveNext is extendable
              //    passCount 1: OK if NOT level === 1
              //
              //  STILL before next shift
              //    passCount 0: OK if not extendable and level > 1(extendable and level > 1 should start at a shift)
              //    passCount 1: any move OK
              //
              // Strategy:
              //   Trying to get extendables to start on beat 1, to maximize effect of the setupbar handling
              //   Trying to match climax / spicy wherever possible
              if (this.shiftIdx > songShifts.length - 1) {
                audit = 'END of shifts'
                return [true, audit]
              }

              // CASE 1: we left an unmatched shift behind when we added the last perm move
              if (songShifts[this.shiftIdx].pos < accBeats) {
                // pass zero or one
                // if (moveCurr.lengthextendable && moveCurr.level !== 1) {
                this.missedShifts.push(songShifts[this.shiftIdx])
                audit = 'SHIFTER: MISSED shift: pos ' + songShifts[this.shiftIdx].pos
                return [false, audit]

                // CASE 2: we hit a song shift bang on exactly
              } else if (songShifts[this.shiftIdx].pos === accBeats) {
                if (moveNext && moveNext.level !== 1) {
                  if (that.passCount === 0) {
                    if (songShifts[this.shiftIdx].gear === 'spicy' || songShifts[this.shiftIdx].gear === 'climax') {
                      if (moveNext.gear === 'upshift') {
                        audit = 'SHIFTER: pass 0, UPSHIFT match: ' + moveNext.move
                        this.shiftIdx += 1
                        return [true, audit]
                      } else {
                        audit = 'SHIFTER: pass 0, not an UPSHIFT match: ' + moveNext.move
                        return [false, audit]
                      }
                    } else {
                      audit = 'SHIFTER: pass 0, accepted here (any move except level 1): ' + moveNext.move
                      this.shiftIdx += 1
                      return [true, audit]
                    }
                  } else { // passCount 1
                    audit = 'SHIFTER: pass 1, accepted here (any move except level 1): ' + moveNext.move
                    this.shiftIdx += 1
                    return [true, audit]
                  }
                } else { // guapea, etc is level 1
                  if (moveNext) {
                    audit = 'SHIFTER: level 1 move is not good enough: ' + moveNext.move
                    return [false, audit] // guapea etc: not good enough to hit a shift!
                  } else {
                    audit = 'SHIFTER: No next move in this perm, pass'
                    return [true, audit]
                  }
                }

                // CASE 3: we haven't caught up to the next songshift yet
              } else if (songShifts[this.shiftIdx].pos > accBeats) {
                // After adding the current move, we still haven't reached the next song shift.
                // ==> OK fit
                if (moveNext) {
                  if (that.passCount === 0) {
                    if (moveNext.lengthextendable && moveNext.level > 1) {
                      audit = 'SHIFTER: pass 0, extendable must fall on 1: ' + moveNext.move
                      return [false, audit]
                    } else {
                      audit = 'SHIFTER: pass 0, move accepted for mid-shift: ' + moveNext.move
                      return [true, audit]
                    }
                  } else {
                    audit = 'SHIFTER: pass 1, move accepted for mid-shift: ' + moveNext.move
                    return [true, audit]
                  }
                } else {
                  audit = 'SHIFTER: No next move in this perm, pass'
                  return [true, audit]
                }
              }
            }
            // // a "shift" is 1 of ["refresh"|"climax"|"spicy"]; "upshift" is ONLY "climax" or "spicy"
            // if (passCount === 0) return move && !move.upshift && ((shift.gear === 'climax') || (shift.gear === 'spicy'))
            // else if (passCount === 1) return move && !move.upshift && ((shift.gear === 'refresh') || (shift.gear === 'climax') || (shift.gear === 'spicy'))
          }
        }
      }
      for (this.passCount = 0; this.passCount < 2; this.passCount++) {
        // re-initialize in the loop
        screener.accBeats = 0
        screener.borrowBeats = 0
        screener.shifter.shiftIdx = 0
        let res = true // if still true after next loop, the perm is a keeper

        // If there are clave shifts in the song, marked as gear = "cambio":
        //  - set a special move at the cambio, "Cruce"
        //  - place the next beat index right after the Cruce
        //  - in addition to the original screener.check, submit each saved index separately
        // Screener has logic to fill moves in avoiding the preset Cruce calls.
        for (let i = 0; i < perm.moves[0].length; i++) { // we've added item 0 before we started
          ;[res, audit]= screener.check(
            perm.moves[0][i],
            perm.moves[0][i + 1] || null,
            perm.moves[0][i - 1] || null,
            songShifts,
            that // the AutoFiller object
          )
          if (res === false) {
            console.log('reject: ' + perm.hdr.id + ' pass-' + this.passCount + '-' + audit)
            break
          }
        }
        if (res) {
          this.okPerms.push(perm) // if all the moves fit, it's certified OK
          break
        }
      }
    }
    // NOW we have all the eligible perms in okPerms
    const timeFinish = new Date()
    // console.log('genOkPerms made ' + this.okPerms.length + ' perms in ' + (timeFinish - timeStart) + ' ms')
    // console.log('  - generate time/filter time ' + (timeToFilter - timeStart) + ' / ' + (timeFinish - timeToFilter) + ' ms')
    //  Do we have any fitting permutations at all?
    // okPerms has all the legal "permutations" per the song,
    //   i.e. the move length vs refresh gears, upshift flag vs climax/spicy gears, and 'allow one miss' flag

    // select random perm
    //   hepler for randIndex: get total weight
    const totWeight = this.okPerms.reduce((acc, perm) => acc + perm.hdr.weight, 0)
    // get a random number in the domain of the total
    const randIndex = () => {
      const rnd = Math.random() * totWeight
      let acc = 0
      // iterate to find the 'hit' perm
      for (let i = 0; i < this.okPerms.length - 1; i++) {
        acc += this.okPerms[i].hdr.weight
        if (acc > rnd) return i
      }
      // infinitesimal chance of hitting infinitely small rounding at the last loop?
      return this.okPerms.length - 1
    }
    this.selPermIndex = randIndex()
    const upshiftMsg = '' // in future: if upshift matching is enforced, report results
    // console.log((upshiftMsg ? upshiftMsg + '  ' : '') + 'Field "selPermIndex" holds index of a random selection from a subset of: ' + this.okPerms.length)
  }

  stripOuterQuotes (str) {
    // mermaid requires us to put quotes around text field, in case there's even a spec character like '('
    // so we now need to detect and remove surrounding quotes for presentation
    let bFix = false
    if (str[0] === str[str.length - 1]) { // if the first char === last char
      if (str[0] === '"' || str[0] === '\'') { // if the first char is one of the quote chars
        bFix = true
      }
    }
    if (bFix) {
      return str.substring(1, str.length - 1)
    } else {
      return str
    }
  }

  autoFill () {
    // fill the song beats with calls based on combos in the system
    // 1. check if it's the first call in the song: then, use a combo marked with startup flag
    // 2. loop until song beats are full:
    //      a) start at currentBeatIndex, i.e. the starting spot for a combo
    //      b) pick a combo at random, but odds set by the "weight" of each combo
    //      c) divide the song into segments IF any cambio (irregular) beats are marked in the song beat "gear"
    //      d) call genOKPerms to check all the parms against the song and our rules for matching
    //      e)
    //
    // TO USE:
    //   this.currentBeatIndex
    //   this.lstTimesWork
    //   this.lstSeqEdited (clear it first, then fill it)

    /* eslint-disable */

    // // TRY STARTING ON BEAT 3 or so?
    this.lstSeqEdited = []
    let retFillSeq = new Array()

    const that = this
    let firstPerm = true

    let openingCombos = []
    // parallel arrays to openingCombos
    let openingCombosWts = []
    let openingCombosWtsCum = []

    let mainCombos = []
    // parallel arrays to mainCombos
    let mainCombosWts = []
    let mainCombosWtsCum = [] // parallel arrays to mainCombos

    let wtOpeningTotal = 0
    let wtMainTotal = 0

    let aryAudit = [] // we'll track what choices are made
    let workingCombos = _cloneDeep(that.editedCombos)

    const prepareClaveSwitches = function (start, lstSeq, lstBeats, lstMoves, currentBeatIndex) {
      // for now, this is called with arg start = arg currentBeatIndex.  But that may change...
      // If the song has clave switches, normal moves won't fit
      // Here, we find the switches (marked with the gear "cambio")
      //   and insert a move in the sequence (call is currently "Cruce") that is only 4 counts long
      // RETURNS: the number of such moves inserted
      let aryFillSpots = []
      for (let i = currentBeatIndex; i < lstBeats.length; i++) {
        if (lstBeats[i].gear === 'cambio') {
          // the gear creation should prevent two consecutive beats both with a shift
          aryFillSpots.push(i)
        }
      }
      return aryFillSpots || []
    }

    const refreshCombos = function () {
      openingCombos = []; openingCombosWts = []; openingCombosWtsCum = []; wtOpeningTotal = 0
      mainCombos = []; mainCombosWts = []; mainCombosWtsCum = []; wtMainTotal = 0
      for (const [_, value] of Object.entries(workingCombos)) {
        let startup = false
        if (cleanbool(value.$.startup) === true) startup = true // poss string s/b integer
        const wt = parseInt(value.$.weight)
        if (wt > 0) {
          if (startup) {
              openingCombos.push(value)
              openingCombosWts.push(wt)
              wtOpeningTotal += wt
          } else {
            mainCombos.push(value)
            mainCombosWts.push(wt)
            wtMainTotal += wt
          }
        }
      }
      let i
      let cum = 0
      for (i = 0; i < openingCombos.length; i++) {
        openingCombosWts[i] = openingCombosWts[i] / wtOpeningTotal
        cum += openingCombosWts[i]
        openingCombosWtsCum.push(cum)
      }
      cum = 0
      for (i = 0; i < mainCombos.length; i++) {
        mainCombosWts[i] = mainCombosWts[i] / wtMainTotal
        cum += mainCombosWts[i]
        mainCombosWtsCum.push(cum)
      }
    }
    refreshCombos() // first time, no combos are rejected
    // THIS SECTION identifies short musical measures.
    //  We consider them a limit when generating our move lists (perms)
    //  They must be populated using special short moves called moveCruce (or maybe moveFoto if they are 3/4 size)

    // First let's find these limiting indexes in our lstTimesAndGears
    this.aryFillSpots = [this.currentBeatIndex].concat(prepareClaveSwitches(this.currentBeatIndex, this.lstSeqEdited, this.lstTimesAndGears, this.editedMoves, this.currentBeatIndex))
    const timeStart = new Date() // for runtime profiling

    // OK we have our limits.  For each available segment of beats,
    //  generate perms (groups of moves) to fill them
    for (let spot = 0; spot < this.aryFillSpots.length; spot += 1){
      // first move of the segment
      for (let fill = this.currentBeatIndex; fill < this.aryFillSpots[spot]; fill++){
        // retFillSeq.push(moveContinue) NO: convention is no value placed here
        retFillSeq.push(undefined) // A Continue move is a placeholder: do nothing, say nothing... just take up time
      }
      this.currentBeatIndex = this.aryFillSpots[spot] // this value is read by genOKPerms called below

      if (spot > 0) {
        // the first spot (index 0) is our starting spot.  If there are any more after this,
        //  then there must be a Cambio (short measure) gear, and we'll put a moveCruce at that spot
        let mv = this.moveCruce
        let aud = 'sw~ Cambio (half measure clave switch)'
        let bts = that.lstTimesAndGears; let ix = this.currentBeatIndex // make next sec easier to read!
        // There's a slight chance of a short measure that is longer than 2 beats of 4: 3 beats of 4.
        // In that case we'll call Foto currently
        try { // take the short cambio interval, x 2.  Div by total of preceding and following interval.
          // if 5/8 or more, then the cambio is a bit longer.  Instead of a half measure, it's 6/8 of a measure.  e.g. Pachito Alonso, La Calle me Llama
          if (((bts[ix + 1].time - bts[ix].time) * 2) / ((bts[ix + 2].time - bts[ix + 1].time) + (bts[ix].time - bts[ix - 1].time)) > 0.625) {
            mv = this.moveFoto
            let aud = 'sw~ Cambio (3/4 measure clave switch)'
          }
        } catch (error) {
          console.log ('Anticipated ERROR Checking cambio measure to see if 3/4 of a measure: leaving as half a measure!')
        }
        retFillSeq.push(mv)
        aryAudit.push(aud)
        this.currentBeatIndex += 1 // this is used by genOKPerms called below
        workingCombos = _cloneDeep(that.editedCombos)  // start next segment with a full choice of combos, ready for next call to refreshCombos
      }

      let ary, pmf, cdf, chooseCombo // flexible pointers in the following loop
      while (true) { // we will call break to exit
        // refer to the data to be used
        refreshCombos()
        if (firstPerm) { ary = openingCombos; pmf = openingCombosWts; cdf = openingCombosWtsCum }
        else { ary = mainCombos; pmf = mainCombosWts; cdf = mainCombosWtsCum }
        if (ary.length === 0) {
          aryAudit.push('xx~* XXXX NO FITS, and NO MORE COMBOS to try!')
          break
        }
        chooseCombo = () => {
          var rand = Math.random()
          var ind = cdf.findIndex(el => rand <= el)
          try {
            return ary[ind]
          } catch (error) {
            console.error('error in chooseCombo fn, ary.length:' & ary.length & ', ind:' & ind)
          }
        }
        let cbo = chooseCombo()
        aryAudit.push('cn~' + cbo.$.name + ' [at pos ' + this.currentBeatIndex + ']')
        this.genOkPerms(cbo) // now all legal perms for the current beat are in this.okPerms
        const pmSel = this.okPerms[this.selPermIndex]
        if (!pmSel) {
          delete workingCombos[cbo.$.name]
          aryAudit.push('cx~* XXX no fits in combo (all perms ' + this.numAllPerms + ')')
        } else {
          firstPerm = false
          aryAudit.push('pf~' + pmSel.hdr.id + ' pass-' + this.passCount + '- (okperms ' + this.okPerms.length + ', all perms '+ this.numAllPerms +')')
          retFillSeq.push(...pmSel.moves[0])
          pmSel.moves[0].forEach(element => {
            this.currentBeatIndex += element.length
          })
          // are we done yet?
          if (this.currentBeatIndex >= this.lstTimesAndGears.length) break
          if (this.aryFillSpots[spot+1]) if (this.currentBeatIndex >= this.aryFillSpots[spot+1]) break

          // we have a perm for this beat, now reset our choices for NEXT available beat
          workingCombos = _cloneDeep(that.editedCombos)
        }
      }
    }
    const elapsed = new Date() - timeStart
    aryAudit.push('TIME: ' + elapsed/1000 + ' sec.')
    return [retFillSeq, aryAudit]
  }

  // -------------------------
  // -- BEGIN RMSpot ONLY CODE
  // -------------------------
  // RMSpot and RuedaMatic Editor share the same processing code for AutoFiller
  //   but the raw data is in slightly different format.  Use adaptors when
  //   feeding AutoFill from RMS, and when getting results
  adaptorFromRMSMoves (rmSpotMoves) {
    let clonedMoves = _cloneDeep(rmSpotMoves)
    let newValue
    let compatMoves = []
    for (const [_, value] of Object.entries(clonedMoves)) {
      newValue = { $: value }
      let newComment = newValue.$.comment
      delete newValue.$.comment
      newValue.comment = newComment
      compatMoves.push(newValue)
    }
    const movesSortable = compatMoves.map(m => { m.$.nameSorted = m.$.name.toLocaleLowerCase(); return m })
    // nameSorted was added recently, guard against old files that might not have it
    return _sortBy(movesSortable, m => m.$.nameSorted)
  }

  adaptorFromRMSCombos (rmSpotCombos) {
    let clonedCombos = _cloneDeep(rmSpotCombos)
    let compatCombos = {}
    for (const [key, value] of Object.entries(clonedCombos)) {
      let newNodes = value.nodes // singular
      delete value.nodes
      compatCombos[key] = { $: value, nodes: newNodes }
    }
    return compatCombos
  }

  // -----------------------
  // -- END RMSpot ONLY CODE
  // -----------------------

}

export default AutoFiller
