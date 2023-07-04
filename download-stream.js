// ==UserScript==
// @name        New script
// @namespace   Violentmonkey Scripts
// @match       *://*/*
// @grant       none
// @version     1.0
// @author      -
// @description 4/3/2023, 2:16:14 PM
// ==/UserScript==

const blobsDict = {};

(() => {
  // overrides URL methods to be able to retrieve the original blobs later on
  const old_create = URL.createObjectURL;
  const old_revoke = URL.revokeObjectURL;
  Object.defineProperty(URL, 'createObjectURL', {
    get: () => storeAndCreate
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    get: () => forgetAndRevoke
  });
  Object.defineProperty(URL, 'getFromObjectURL', {
    get: () => getBlob
  });
  const dict = blobsDict;

  function storeAndCreate(blob) {
    const url = old_create(blob); // let it throw if it has to
      console.log('MY: createObjectURL', url, blob);
    dict[url] = blob;
    return url
  }

  function forgetAndRevoke(url) {
    old_revoke(url);
    try {
      if(new URL(url).protocol === 'blob:') {
        delete dict[url];
      }
    } catch(e){}
  }

  function getBlob(url) {
    return dict[url] || null;
  }
})();


let askingUser = false;
let savingFiles = false;
let applyOpened = false;
let outputFiles = [];

async function myShowSaveFilePicker(mime) {
  let res;
  let resolve;
  let e = document.createElement('div');
  e.innerHTML = '<div style="position: absolute; top: 0px; left: 0px; background: silver; font-size: 30px; padding: 20px; cursor: pointer; z-index: 100000">Open file dialog for ' + mime + '</div>';
  e.onclick = async () => {
    res = await showSaveFilePicker();
    resolve();
  };
  document.body.appendChild(e);
  await new Promise(r => resolve = r);
  document.body.removeChild(e);
  applyWindow();
  return res;
}

function applyWindow() {
  if (applyOpened) return;
  applyOpened = true;
  let e = document.createElement('div');
  e.innerHTML = '<div style="position: absolute; top: 90px; left: 0px; background: silver; font-size: 30px; padding: 20px; cursor: pointer; z-index: 100000">Apply</div>';
  e.onclick = async () => {
    let f;
    while ((f = outputFiles.find(x => x.file !== null))) {
      f.handle.close();
      f.file = null;
      f.handle = null;
    }
    document.body.removeChild(e);
  };
  document.body.appendChild(e);
}

async function askUser() {
  if (askingUser) return;
  askingUser = true;
  try {
    let f;
    while ((f = outputFiles.find(x => x.file === null))) {
      let fh = await myShowSaveFilePicker(f.mime);
      console.log('MY: ', fh);
      f.handle = await fh.createWritable();
      console.log('MY: ', f);
      f.file = fh;
      saveFiles();
    }
  } finally {
    askingUser = false;
  }
}

async function saveFiles() {
  if (savingFiles) return;
  savingFiles = true;
  try {
    let f;
    while ((f = outputFiles.find(x => x.data.length && x.file !== null))) {
      for (let chunk of f.data) {
        f.handle.write(chunk);
      }
      f.data = [];
    }
  } finally {
    savingFiles = false;
  }
}


MediaSource.prototype.old_addSourceBuffer = MediaSource.prototype.addSourceBuffer;

MediaSource.prototype.addSourceBuffer = function(...args) {
  let fileObject = {
    file: null,
    data: [],
    mime: args[0],
  };
  outputFiles.push(fileObject);
  askUser();
  console.log('MY: addSourceBuffer', args);
  let res = this.old_addSourceBuffer(...args);
  console.log('MY: ', res);
  res.old_appendBuffer = res.appendBuffer;
  res.appendBuffer = function(...args2) {
    console.log('MY: appendBuffer', args2);
    fileObject.data.push(args2[0]);
    saveFiles();
    return this.old_appendBuffer(...args2);
  }
  return res;
}
