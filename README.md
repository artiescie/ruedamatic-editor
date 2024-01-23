# ruedamatic-editor

**Electron program**, calls out rueda moves for dancing "rueda de casino".  Edits the data files for that purpose.  Produces simultaneously data files compatible with companion web application "rm-spot", which makes the rueda calls with Spotify.com music using the official Spotify web API.

### Build Setup

``` bash
# install dependencies
npm install

# serve with hot reload at localhost:9080
npm run dev

# build electron application for production
npm run build
```

### Some specific dependencies
#### In folder static:
 - ffmpeg, 
 - recycle-bin.exe.  
 See the file "static/what's here.txt"

#### Root folder, build:
 - npm build includes <strong><em>fixdate.sh</strong></em>, which updates the build date in SystemInformation.vue
    - depends on linux bash, replace-in-file package from npm, installed globally

---

This project was generated with [electron-vue](https://github.com/SimulatedGREG/electron-vue)@[9c9bf75](https://github.com/SimulatedGREG/electron-vue/tree/9c9bf75630add075bfa58f52e391e82fb1b9f44a) using [vue-cli](https://github.com/vuejs/vue-cli). Documentation about the original structure can be found [here](https://simulatedgreg.gitbooks.io/electron-vue/content/index.html).
