<template>
  <div>
    <simplert :useRadius="true" :useIcon="true" ref="simplert"/>
    <div>
      <div class="title" variant="success"><strong>RuedaMatic Data</strong><em> (hover for more)</em></div>
      <div class="items">
        <div v-if="this.getUserType === '2'" class="item" title="All the songs we have beats for (listed on Songs tab)">
          <div class="name">Beats files: {{beats.length}} ({{beats.filter(r => r.numMatches < INCOMPLETE_LIM).length}} too small)&nbsp;
            <b-button size="sm" class="py-0 alt" @click="showModalBeats = true" ><v-icon  class="m-1" scale=1 name="drum"/>Incompletes</b-button>
          </div>
        </div>
        <div v-if="this.getUserType === '2'" class="item" title="If you have more than 1 scheme (sets of moves), you can change scheme in top green navbar dropdown.
For example: you might have a 'scheme' of moves for basic rueda, one for advanced rueda, and one for salsa suelta.">
          <div class="name">Installed Schemes: {{$store.state.movesStore.installedSchemes.length}}&nbsp;
            <b-button size="sm" class="py-0 alt" @click="getSchemeData(); showModalSchemes = true" >
              <v-icon  class="m-1" scale=1 name="th-large"/>{{getUserType === '2' ? 'Edit/Delete' : 'View'}}</b-button>
            <b-button v-if="getUserType === '2'" size="sm" class="py-0 alt" @click="schemeMode='create'; getSchemeData(); showModalSchemeEdit = true" >
              <v-icon  class="m-1" scale=1 name="plus"/>Create</b-button>
          </div>
        </div>
        <div class="item" title="If you have more than 1 scheme (sets of moves), you can change scheme in top green navbar dropdown.
For example: you might have a 'scheme' of moves for basic rueda, one for advanced rueda, and one for salsa suelta.">
          <div class="name">Current Scheme:</div>
          <div class="value">{{ GUIfyCurrentScheme }}</div>
        </div>
        <div class="item" title="Number of Moves on the moves tab for this scheme.
Excludes the reserved move 'Continue'">
          <div class="name">Number of Moves:</div>
          <div class="value">{{ numberOfMoves }}</div>
        </div>
        <div class="item" title="Moves on the moves tab that play an invalid MP3 file -
May need to click Refresh below if changing">
          <div class="name">Moves without a valid MP3 call:</div>
          <div class="value">{{ movesNoCall }}</div>
        </div>
        <div class="item" title="Number of MP3 files in the vueltas folder for this scheme -
Note: MP3 calls may be used by different Moves (e.g. sometimes you may need a delay) -
Note: You may need to click 'Refresh' if you are back-and-forth modifying moves">
          <div class="name">Number of Calls available in scheme:</div>
          <div class="value">{{ numberOfCalls }}</div>
        </div>
        <div class="item" title="MP3 files in vueltas folder, that are not used in a Move on the Moves tab -
May need to click Refresh below if changing">
          <div class="name">MP3 calls not used by any Moves:</div>
          <div class="value">{{ callsNotUsed }}</div>
        </div>
        <div class="item" title="If you create and share,
this id will be shown when people use your work.">
          <div class="name">Author ID:</div>
          <span><span class="value">{{ authorId }} </span><span>&nbsp;<b-button size="sm" class="py-0 alt"
              @click="getAuthor" ><v-icon  class="m-1" scale=1 name="portrait"/>Change</b-button></span>
          </span>
        </div>
        <div class="item" title="Calls can be made during the 1, 2, 3, or 4-count">
          <div class="name">Call timing:</div>
          <span>
            <span>
              <b-form-select size="sm"
                :options="[{text:'Call during the 1 count',value:1},{text:'Call during the 2 count',value:2},{text:'Call during the 3 count',value:3},{text:'Call during the 4 count',value:4}]"
                v-model="beatToCallOn" />
            </span>
          </span>
        </div>
        <div v-if="this.getUserType === '2'" class="item" title="If you are currently adding MP3 Call files to the vueltas folder,
click here to update counts and validations shown above">
          <div class="name">On add/remove Call files:</div>
          <span><span>  <b-button size="sm" class="py-0 alt"
              @click="refreshForNewCallFiles" > <v-icon  class="m-1" scale=1 name="sync"/> Refresh</b-button></span>
          </span>
        </div>
        <div class="item" title="Browse the RM internal working folders">
          <div class="name">Browse RuedaMatic folders</div>
          <span><span>  <b-button size="sm" class="py-0 alt"
              @click="openFileExplorer" > <v-icon  class="m-1" scale=1 name="home"/> Browse</b-button></span>
          </span>
        </div>
      </div>
      <div class="title" :title="getSysInfoTooltip"><strong>System Info</strong><em> (hover for more)</em></div>
      <div class="items">
        <div class="item" title="Version you are using of this program">
          <div class="name">Ver </div>
          <div class="value">{{ ruedamaticversion }} </div>&nbsp;<div class="name">Built Fri Jan 26, 2024 - (04:21 PM)</div>
        </div>
      </div>
      <div v-if="this.getUserType === '2'" class="title" :title="getSpotifyTooltip"><strong>RM-spot</strong><em> (hover for more)</em></div>
      <div v-if="this.getUserType === '2'" class="items">
        <div class="item" title="Data used by the RM-spot website - combines rueda calls with spotify music">
          <div class="name">Prep data for RM-spot:</div>
          <b-button size="sm" class="py-0 alt" :disabled="bLoadingSprites"
              @click="getSpotify" ><v-icon  class="m-1" scale=1 name="portrait"/>Create</b-button>
              <pulse-loader v-if="bLoadingSprites" color="red" style="height: 27px;display: inline-block;align-items: center;justify-content: center" />
        </div>
      </div>
    </div>

    <b-modal id="getSpotify" title="Make RM-Spot Audiosprite (just for this scheme!)" ok-only>
      <p>Web app RM-spot needs a special action, appending all the call files to a single "sprite" file in the rm-spot folder.</p>
      <b-form-fieldset title="Update the RM-spot web rueda calls." >
        <b-btn variant="success" class="m-1" @click="createAudioSpriteForCalls" :disabled="bLoadingSprites"
          title="Advanced: Generate Audiosprites for RM-Spot (Spotify) for all calls in the scheme">Audiosprite for {{RMEFolder}}
        </b-btn>
      </b-form-fieldset>
    </b-modal>

    <b-modal id="getAuthor" title="Author id" @ok="saveAuthor" @shown="$refs.authorID.focus()">
      <p>ID is saved in files you work on.  Try to be unique!</p>
      <b-form-fieldset title="Saved in files you work on." label-cols="3" label="Author ID:">
        <b-form-input v-model="workingAuthorID" ref="authorID"/>
      </b-form-fieldset>
    </b-modal>

    <!-- showModalSchemeEdit used for Edit and Create scheme details -->
    <b-modal v-model="showModalSchemeEdit" id="editScheme" :title="schemeMode==='create'?'Create Scheme':'Edit Scheme'"
        :ok-disabled="schemeDlgName4GUI.length <= 3" @ok="handleSchemeUpdate" @shown="$refs.schemeName.focus()">
      <p>{{schemeMode==="create"?'Create new scheme. (lower case, underscores not spaces)': 'If name is changed, the change flows through related move and sequence files.  Old Name is: \'' + oldSchemeName + '\''}}</p>
      <b-form-fieldset title="Longer than 3 characters; lowercase; diacritics; and underscore accepted" label-cols="3" label="Name: ">
        <b-form-input v-model="schemeDlgName4GUI" ref="schemeName"/>
      </b-form-fieldset>
      <b-form-fieldset title="60 characters will be saved." label-cols="3" label="Description: ">
        <b-form-textarea v-model="schemeDlgDescription" ref="schemeDescription"/>
      </b-form-fieldset>
    </b-modal>

    <b-modal v-model="showModalSchemes" id="modalSchemes" title="Schemes" size="xl">
      <p>Schemes created or installed on this computer.</p>
      <b-table :items="schemeData" :fields="schemeFields">
        <template v-if="getUserType === '2'" v-slot:cell(actions)="row">
          <b-btn variant="warning" size="sm" @click="schemeMode='edit'; details(row.item)">Edit
          </b-btn>
          <b-btn variant="danger" size="sm" @click="schemeMode='delete'; showDeleteDlg(row.item)">Delete
          </b-btn>
        </template>
        <template v-else v-slot:cell(actions)="row">(Wizard only)</template>
      </b-table>
    </b-modal>

    <b-modal v-model="showModalBeats" id="modalBeats" title="Incomplete beats files" size="xl">
      <p v-if="beats.filter(r => r.numMatches < INCOMPLETE_LIM).length > 0" >These beats appear to be incomplete (&lt;{{INCOMPLETE_LIM}} beats in the file):</p>
      <p v-else>No incomplete beats files detected (&lt;{{INCOMPLETE_LIM}} beats in the file)</p>
      <ul>
        <li v-for="(item, index) in beats.filter(r => r.numMatches < INCOMPLETE_LIM)" :key="index">
          {{getBasename(item.file)}}
        </li>
      </ul>
    </b-modal>

  </div>
</template>

<script>
// warning: my tests find AdmZip is ok for extract, no good for compress.  It messes up non-ASCII characters.  Use archiver for packing.
import path from 'path'
import electron from 'electron'
import { exec } from 'child_process'
import DiscDataHelper from '../../store/shared/DiscDataHelper.js'
import fs from 'fs-extra'
import klawSync from 'klaw-sync' // file system walker
import replace from 'replace-in-file'
import createAudioSprite from './audiosprite-breezy'

const DOCDIR = electron.remote.app.getPath('documents')
const RMDIR = DOCDIR + '/RuedaMaticEditor'
const RMSPOT = path.join(RMDIR, 'rm-spot').replace(/\\/g, '/') // used by AudioSprite. Some code requires the unix file separator.  Other cases, backslash still works for Windows.

// reevaluate at the point of use, so it uses right scheme as parent folder
let SEQDIR // = RMDIR + '/' + this.RMEFolder.substring + '/secuencias_para_canciones'
let VUELTASDIR // = RMDIR + '/' + this.RMEFolder.substring + '/vueltas'

if ((fs, klawSync, replace, SEQDIR, VUELTASDIR)) console.log('keep unused declarations')

const discDataHelper = new DiscDataHelper()

export default {
  data () {
    return {
      bLoadingSprites: false, // the busy wheel for prep of RM-spot audiosprite
      diagTitle: '',
      diagContent: '',
      workingAuthorID: this.$store.state.settingsStore.settings.authorId, // initial value
      // Sentinel value to flag the beats as likely incomplete, due to low number.
      //   This probably shows items that user intended to delete but forgot!
      INCOMPLETE_LIM: 40,
      // beats - computed on opening the schemes dialog
      beats: [],
      // modal schemes
      showModalSchemes: false, // model for open/close schemes modal window,
      showModalSchemeEdit: false, // edit/create scheme modal
      showModalBeats: false, // model for open/close beats modal window,
      schemeFields: [
        {
          key: 'name',
          sortable: true,
          // in GUI we try not to show the conventional folder name with scheme_ prefix: we trim it off
          formatter: name => {
            return name.substring(7)
          }
        },
        { key: 'author', sortable: true },
        { key: 'description', sortable: true },
        { key: 'move_count', sortable: true },
        { key: 'combo_count', sortable: true },
        { key: 'seq_count', sortable: true },
        { key: 'actions', sortable: true }
      ],
      schemeData: [], // filled on opening the scheme dialog, by getSchemeData
      schemeDlgName4GUI: '',
      oldSchemeName: '',
      oldSchemeDescription: '',
      schemeDlgDescription: '',
      schemeMode: '' // 'edit' | 'create'
    }
  },
  activated () {
    this.refreshForNewCallFiles() // called also on render
    // countBeats
    const results = replace.sync({
      files: path.join(RMDIR, 'compases_para_canciones', '*.xml'),
      from: /^\s*<beat.*>[0-9]*<\/beat>\s*$/gm,
      to: 'dryrun',
      countMatches: true,
      dry: true
    })
    // const thresh = 30 // less than this, consider incomplete
    // const resTooSmall = results.filter(r => r.numMatches < thresh)
    this.beats = results
  },
  computed: {
    getUserType () {
      return this.$store.state.settingsStore.settings.userType
    },
    getSysInfoTooltip () {
      const title = 'BootstrapbootstrapVue version: ' + this.bootstrapVue + '\n' +
        'Vue.js version: ' + this.vue + '\n' +
        'Electron version: ' + this.electron + '\n' +
        'Node version: ' + this.node + '\n' +
        'Platform: ' + this.platform + '\n'
      return title
    },
    getSpotifyTooltip () {
      const title = 'Web app RM-spot uses a version of RuedaMatic data.\n' +
        'Use these buttons to update Audiosprite files, containing the audio for the calls.\n' +
        'The output is a large mp3, located in "rm-spot" folder for each scheme.\n' +
        'From there, upload to the folder of the same name on your RM-spot server.\n'
      return title
    },
    RMEFolder () {
      return this.$store.state.settingsStore.settings.RMEFolder
    },
    GUIfyCurrentScheme () {
      return this.RMEFolder.substring(7)
    },
    beatToCallOn: {
      get: function () { return this.$store.state.settingsStore.settings.beatToCallOn },
      set: function (value) {
        this.$store.commit('BEAT_TO_CALL_ON', value)
      }
    },
    authorId () {
      return this.$store.state.settingsStore.settings.authorId
    },
    ruedamaticversion () {
      return this.$store.state.settingsStore.version
    },
    electron () {
      return process.versions.electron
    },
    node () {
      return process.versions.node
    },
    platform () {
      return require('os').platform()
    },
    bootstrapVue () {
      return require('bootstrap-vue/package.json').version
    },
    vue () {
      return require('vue/package.json').version
    },
    callsNotUsed () {
      try {
        return this.$store.getters.getCallsNotUsedDisplay
      } catch (e) {
        return 'no scheme'
      }
    },
    movesNoCall () {
      return this.$store.getters.getMovesNoCallDisplay
    },
    numberOfMoves () {
      try {
        const mvsNoContinue = this.$store.state.movesStore.originalMoves.filter(item => item.$.name !== 'Continue')
        return mvsNoContinue.length
      } catch (e) {
        return 'no scheme'
      }
    },
    numberOfCalls () {
      try {
        return this.$store.state.movesStore.originalCalls.length
      } catch (e) {
        return 'no scheme'
      }
    }
  },
  watch: {
    beatToCallOn (newValue) {
      this.$store.commit('BEAT_TO_CALL_ON', this.beatToCallOn)
    }
  },
  methods: {
    createAudioSpriteForCalls () {
      const scheme = this.RMEFolder
      fs.ensureDir(path.join(RMSPOT, scheme))
      console.log(`making audiosprite for scheme: ${scheme}`)

      const callsGlob = [RMDIR.replace(/\\/g, '/') + '/' + scheme + '/vueltas/*.mp3'] // AudrioSprite requires unix path separator
      // const options = { output: 'result', export: 'mp3', format: 'howler2', silence: 1, store: true, rawparts: 'mp3', path: 'C:/Users/user/Documents/RuedaMaticEditor/scheme_rueda_normal_basica/vueltas' }
      const options = {
        output: RMSPOT + '/' + scheme + '/' + scheme,
        export: 'mp3',
        format: 'howler2',
        silence: 1,
        store: true
      }

      // this.$bvToast.toast('Schemes found: ' + numSchemes + ', will now be processed... please wait!', {title: 'Schemes to process'})
      this.$bvToast.toast('Scheme audiosprite for Spotify will be processed... Please Wait!', { title: scheme })
      this.bLoadingSprites = true
      createAudioSprite(callsGlob, options)
        .then((result) => {
          // doneSchemes += 1
          console.log(result)
          console.log(`Writing audiosprite json file: ${scheme}.json`)
          this.$bvToast.toast('Scheme audiosprite for Spotify ready in rm-spot folder!', { title: result.src[0] })
          // tests in audiosprite-breezy repo use this code to create json: the path option doesn't work??
          fs.writeFileSync(RMSPOT + '/' + scheme + '/' + scheme + '.json', JSON.stringify(result.sprite))
          this.bLoadingSprites = false
        })
        .catch((err) => {
          console.log(err)
          this.bLoadingSprites = false
        })
      // }
      // this.$bvModal.show('diagModal')
      // })
      // fs.ensureDir(RMSPOT)
      // // note: aws-pkg-deploy is a program that also creates these audiosprite files.  That program writes all found schemes in the rm-spotify Development tree, rm-assets folder.
      // // This program writes identical files but puts them in it's own folder as a transfer directory.  And it only writes the currently loaded scheme.
      // // this module expects forward slash on Windows
    },
    showDeleteDlg (scheme) {
      this.$bvModal.msgBoxConfirm(`Delete (to recycle bin) scheme "${scheme.name.substring(7)}" - are you sure?`)
        .then(value => {
          this.recycleScheme(path.join(RMDIR, scheme.name))
        })
        .catch(err => {
          console.log(`Recycling scheme: ${scheme}, ERROR: ${err.message}`)
        })
    },
    recycleScheme (schemePath) {
      electron.ipcRenderer.on('asynch-scheme-delete-result', (event, data) => {
        this.$store.commit('UPDATE_INSTALLED_SCHEMES_FLAG', true)
        this.showModalSchemes = false
        console.log('ipcRenderer got event with: ' + data)
        this.$bvModal.msgBoxOk('Scheme has been sent to the Recycle bin.')
      })
      console.log('ipcRenderer requesting recycling of scheme')
      electron.ipcRenderer.send('asynch-scheme-delete-request', schemePath)
    },
    handleSchemeUpdate () {
      let RIFtarget, RIFpayload, RIFschemeOptions, RIFresults // for replace-in-file boilerplate
      const dateTimeISO = new Date().toISOString()
      // enforce convention of underscore replaces space char
      const dirSch = 'scheme_' + this.schemeDlgName4GUI.replace(/ /g, '_')
      const pathSch = path.join(RMDIR, dirSch)
      // use normalize to remove any diacritic for simpler regex test
      //  then if passes, allow the original text with diacritics
      const normName = this.schemeDlgName4GUI.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      const aryMatch = normName.match(/^[a-z_ ]+$/g)
      if (!Array.isArray(aryMatch)) { // no match if no array
        this.$bvModal.msgBoxOk('Require lower case letters, > 3 chars.', { title: 'Invalid scheme name' })
        return
      }
      this.schemeDlgDescription = this.schemeDlgDescription.trim()
      if (this.schemeDlgDescription.length > 100) {
        this.$bvModal.msgBoxOk('Please check and try again!', { title: 'Max 100 chars in description' })
        return
      }
      if (this.schemeMode === 'create') {
        console.log('create scheme')
        try {
          if (fs.pathExistsSync(pathSch)) {
            this.$bvModal.msgBoxOk('Please check and try again!', { title: 'Folder exists already' })
            return
          }
          fs.copySync(path.join(__static, '/scheme_rueda_template'), pathSch) // copy the static folders and files, the basics of a scheme
          // rename the scheme file
          fs.moveSync(path.join(pathSch, 'scheme_rueda_template.scheme'), path.join(pathSch, dirSch + '.scheme'))
          // update the description
          // RIF = replace-in-file package
          RIFtarget = new RegExp('"description":.*,') // $ regex symbol does not match CRLF
          RIFpayload = '"description": "' + this.schemeDlgDescription.trim() + '",'
          RIFschemeOptions = {
            files: path.join(pathSch, dirSch + '.scheme'),
            from: RIFtarget,
            to: RIFpayload
          }
          RIFresults = replace.sync(RIFschemeOptions)
          //     console.log(RIFresults.filter(item => item.hasChanged).map(item => path.basename(item.file)))
          // update the provider (author)
          RIFtarget = new RegExp('"provider":.*,') // $ regex symbol does not match CRLF
          RIFpayload = '"provider": "' + this.authorId + '",'
          RIFschemeOptions = {
            files: path.join(pathSch, dirSch + '.scheme'),
            from: RIFtarget,
            to: RIFpayload
          }
          RIFresults = replace.sync(RIFschemeOptions)
          console.log(RIFresults.filter(item => item.hasChanged).map(item => path.basename(item.file)))
          // in vueltas/moves.xml, replace attributes in:
          // 1:  <author date="2022-09-09T15:12:46.616Z" authorId="rc">Ruedamatic Editor</author>
          RIFtarget = new RegExp('<author.*</author>') // $ regex symbol does not match CRLF
          RIFpayload = `<author date="${dateTimeISO}" authorId="${this.authorId}">Ruedamatic Editor</author>`
          RIFschemeOptions = {
            files: path.join(pathSch, 'vueltas', 'moves.xml'),
            from: RIFtarget,
            to: RIFpayload
          }
          RIFresults = replace.sync(RIFschemeOptions)
          // 2:  <scheme schemeName="scheme_rueda_template" schemeProvider="rc" schemeDate="2022-09-09T15:12:46.616Z">
          RIFtarget = new RegExp('<scheme.*</scheme>') // $ regex symbol does not match CRLF
          RIFpayload = `<scheme schemeName="${dirSch}" schemeProvider="${this.authorId}" schemeDate="${dateTimeISO}">Ruedamatic Editor</scheme>`
          RIFschemeOptions = {
            files: path.join(pathSch, 'vueltas', 'moves.xml'),
            from: RIFtarget,
            to: RIFpayload
          }
          RIFresults = replace.sync(RIFschemeOptions)
          // update the data store
          this.$store.commit('UPDATE_INSTALLED_SCHEMES_FLAG', true)
        } catch (err) { // unexpected error
          this.$bvModal.msgBoxOk(err.message, { title: err.name })
        }
      } else if (this.schemeMode === 'edit') {
        console.log('edit scheme')
        // NAME: did the name change? => 1:rename folder 2:fix moves.xml 3:fix *.seq
        try {
          if (this.oldSchemeName !== this.schemeDlgName4GUI) {
            if (fs.pathExistsSync(pathSch)) {
              this.$bvModal.msgBoxOk('Please check and try again!', { title: 'Folder exists already' })
              return
            }
            // rename the folder
            fs.moveSync(path.join(RMDIR, 'scheme_' + this.oldSchemeName), pathSch)
            // rename the scheme file in it's new folder.  NOTE: contents of scheme file fixed below!
            fs.moveSync(path.join(pathSch, 'scheme_' + this.oldSchemeName + '.scheme'), path.join(pathSch, dirSch + '.scheme'))
            // moves.xml, contains a ref to scheme
            // RIF = replace-in-file package
            RIFtarget = new RegExp('<scheme.*</scheme>') // $ regex symbol does not match CRLF
            RIFpayload = `<scheme schemeName="${dirSch}" schemeProvider="${this.authorId}" schemeDate="${dateTimeISO}">Ruedamatic Editor</scheme>`
            RIFschemeOptions = {
              files: path.join(pathSch, 'vueltas', 'moves.xml'),
              from: RIFtarget,
              to: RIFpayload
            }
            RIFresults = replace.sync(RIFschemeOptions)
            // each .seq contains a ref to the scheme that it belongs to
            RIFtarget = new RegExp('<scheme.*</scheme>') // $ regex symbol does not match CRLF
            RIFpayload = `<scheme provider="${this.authorId}" date="${dateTimeISO}">${dirSch}</scheme>`
            RIFschemeOptions = {
              files: path.join(pathSch, 'secuencias_para_canciones', '*.seq'),
              from: RIFtarget,
              to: RIFpayload
            }
            RIFresults = replace.sync(RIFschemeOptions)
          }
          // NAME: did the name change OR description change?  => CONTENTS of the .scheme file
          if (this.oldSchemeName !== this.schemeDlgName4GUI || this.oldSchemeDescription !== this.schemeDlgDescription) {
            // provider update since we are touching the file
            RIFtarget = new RegExp('"provider":.*,') // $ regex symbol does not match CRLF
            RIFpayload = '"provider": "' + this.authorId + '",'
            RIFschemeOptions = {
              files: path.join(pathSch, dirSch + '.scheme'),
              from: RIFtarget,
              to: RIFpayload
            }
            RIFresults = replace.sync(RIFschemeOptions)
          }
          if (this.oldSchemeDescription !== this.schemeDlgDescription) {
            // scheme file, scheme description update
            RIFtarget = new RegExp('"description":.*,') // $ regex symbol does not match CRLF
            RIFpayload = '"description": "' + this.schemeDlgDescription.trim() + '",'
            RIFschemeOptions = {
              files: path.join(pathSch, dirSch + '.scheme'),
              from: RIFtarget,
              to: RIFpayload
            }
            RIFresults = replace.sync(RIFschemeOptions)
          }
          this.$store.commit('UPDATE_INSTALLED_SCHEMES_FLAG', true)
        } catch (err) {
          this.$bvModal.msgBoxOk('Error: "' + err.message + '".  OPERATION FAILED, results may be inconsistent!  Have RuedaMatic doc folders been altered manually?')
        }
      }
      this.schemeDlgName4GUI = ''
      this.schemeDlgDescription = ''
      this.showModalSchemes = false
    },
    details (item) {
      this.showModalSchemeEdit = true
      this.oldSchemeName = item.name.substring(7)
      this.schemeDlgName4GUI = this.oldSchemeName
      this.oldSchemeDescription = item.description
      this.schemeDlgDescription = this.oldSchemeDescription
    },
    getSchemeData () {
      // outside the loop: collect all moves and sequences
      // inside the loop: read the .scheme [description], filter/count the moves/seq by scheme

      // count all the moves, for all schemes
      // eslint-disable-next-line no-unused-vars
      const resMoves = replace.sync({
        files: path.join(RMDIR, '**', 'moves.xml'),
        from: /<move.*>\n.*\n.*<\/move>\n/g,
        to: 'dryrun',
        countMatches: true,
        dry: true
      })

      // count all the combos, for all schemes
      // eslint-disable-next-line no-unused-vars
      const resCombos = replace.sync({
        files: path.join(RMDIR, '**', 'moves.xml'),
        from: /.*<combo .*>\n(?:.+\n)*?.*<\/combo>.*/g,
        to: 'dryrun',
        countMatches: true,
        dry: true
      })

      // count all the sequences, for all schemes
      // eslint-disable-next-line no-unused-vars
      const resSeq = replace.sync({
        files: path.join(RMDIR, '**', '*.seq'),
        from: /<move *name=".{3,}"\/>/gm,
        to: 'dryrun',
        countMatches: true,
        dry: true
      })

      const retData = {} // return object
      // schemeFields: ['name', 'author', 'description', 'move_count', 'combo_count', 'seq_count'],
      resMoves.forEach((item, index) => {
        const scheme = item.file.split('/')[5]
        if (scheme.substring(0, 7) === 'scheme_') {
          retData[scheme] = { name: scheme }
          retData[scheme].move_count = item.numMatches
          const test = path.join(RMDIR, scheme, scheme + '.scheme')
          // eslint-disable-next-line no-unused-vars
          try {
            const obj = JSON.parse(fs.readFileSync(test, 'utf8'))
            retData[scheme].author = obj.providedBy.provider
            retData[scheme].description = obj.description
            // good place to ensure that seq_count is defined for the scheme: even if there are no sequences,
            // bec there should always be a moves.xml
            retData[scheme].seq_count = 0
          } catch (err) {
            retData[scheme].description = '** Corrupt scheme: missing or incorrect .scheme file! **'
            console.log('Corrupt scheme :' + scheme + ', missing or incorrect .scheme file!')
          }
        }
      })
      resCombos.forEach((item, index) => {
        const scheme = item.file.split('/')[5]
        if (scheme.substring(0, 7) === 'scheme_') {
          if (retData[scheme]) {
            retData[scheme].combo_count = item.numMatches
          } else {
            console.log('Error - no scheme for combo_count: ' + scheme)
          }
        }
      })
      resSeq.forEach((item, index) => {
        const scheme = item.file.split('/')[5]
        if (scheme.substring(0, 7) === 'scheme_') {
          if (retData[scheme]) {
            if (retData[scheme].seq_count) retData[scheme].seq_count += 1
            else retData[scheme].seq_count = 1
          } else {
            console.log('Error - no scheme for seq_count: ' + scheme)
          }
        }
      })
      this.schemeData = Object.values(retData)
    },
    getBasename (myPath) {
      return path.basename(myPath)
    },
    openFileExplorer () {
      const itemFilePath = path.join(RMDIR, 'compases_para_canciones')
      if (!discDataHelper.fileExists(itemFilePath)) {
        this.$bvModal.msgBoxOk('NO RuedaMatic beats folder... maybe you should reinstall!')
        return
      }
      let command = ''
      let fpath
      switch (process.platform) {
        case 'darwin': // someday?
          command = 'open -R ' + itemFilePath
          break
        case 'win32':
          if (process.env.SystemRoot) {
            command = path.join(process.env.SystemRoot, 'explorer.exe')
          } else {
            command = 'explorer.exe'
          }
          command += ' /select,"' + itemFilePath + '"'
          break
        default: // ok it was written for linux, some day useful ;-)
          fpath = path.dirname(itemFilePath)
          command = 'xdg-open ' + fpath
      }
      console.log(command)
      exec(command, function (stdout) {
        // Do something if you really need to
      })
    },
    refreshForNewCallFiles () {
      this.$store.commit('ORIGINAL_CALLS_FILES', this.RMEFolder) // s/b before MOVE_STATE for validation
    },
    getAuthor (event) {
      this.$bvModal.show('getAuthor')
    },
    getSpotify (event) {
      this.$bvModal.show('getSpotify')
    },
    saveAuthor () {
      console.log('saveAuthor')
      this.$store.commit('CHANGE_AUTHORID', this.workingAuthorID)
    }
  }
}
</script>

<style scoped>
    .title {
        color: #038309;
        font-size: 18px;
        font-weight: initial;
        letter-spacing: .25px;
        margin-top: 10px;
    }

    .items {
        margin-top: 8px;
    }

    .item {
        display: flex;
        margin-bottom: 6px;
    }

    .item .name {
        color: #6a6a6a;
        margin-right: 6px;
    }

    .item .value {
        color: #35495e;
        font-weight: bold;
    }
</style>
