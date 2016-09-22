'use babel';


import { CompositeDisposable } from 'atom';
import request from 'request'
import cheerio from 'cheerio'
import google from 'google'

google.resultsPerPage = 1
export default {

  subscriptions: null,

  activate(state) {
    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'geek-fetch:fetch': () => this.fetch()
    }));
  },

  deactivate() {
    this.subscriptions.dispose();
  },


  fetch() {
    let editor
     if (editor = atom.workspace.getActiveTextEditor()) {
       let selection = editor.getSelectedText()
       let language = editor.getGrammar().name
       this.search(selection, language).then( (url) => {
         atom.notifications.addSuccess('Found google results!')
         return this.download(url)
       }).then((html) => {
         let snippet = this.scrape(html)
         if( snippet == '') {
           atom.notifications.addWarning("Nothing doing")
         }
         else {
           atom.notifications.addSuccess('Snippet found')
           editor.insertText(snippet)
         }
       }).catch( (error) => {
         console.log(error);
         atom.notifications.addWarning(error.reason)
       })
     }
   },

   search(query, language) {
     return new Promise((resolve, reject) => {
       let searchString = query + " in "+ language +" site:geeksforgeeks.org"
       console.log(searchString);
       google(searchString, (err, res) => {
         if (err) {
           reject({
             reason: 'A search error has occured'
           })
         } else if (res.links.length === 0) {
            reject({
              reason: 'No results found '
            })
           } else {
             resolve(res.links[0].href)
           }
        })
      })
   },

   scrape(html) {
     $ = cheerio.load(html)
     let all_code = $('pre')
     let str = ''
     for(var i=0; i<all_code.length; i++) {
        let item = all_code.eq(i)
        if(item.attr('class') != undefined ) {
         let classList = item.attr('class').split(' ')
         if(classList[1] === "cpp;") {
           let list = classList[3]
           list = list.substr(1, list.length-3)
           list = list.split(',')
           list = list.map( function (i) {
             return parseInt(i)
           })

           let txt = item.text()
           txt = txt.split("\n")
           for(var j=0; j<txt.length; j++) {
             if(list.includes(j)) {
               str += txt[j] + "\n"
             }
           }
         }
       }
     }
     console.log(str)
     return str;
   },

   download(url) {
     return new Promise((resolve, reject) => {
       request(url, (error, response, body) => {
         if (!error && response.statusCode == 200) {
           resolve(body)
         }
         else {
           reject({
             reason: "Unable to download"
           })
         }
       })
     })
  }
};
