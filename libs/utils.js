
const path          = require("path"),
        fs          = require("fs"),
        CLI         = require('clui'),          // Visual components, guages, tables, spinner
        inquirer    = require('inquirer'),      // CLI UI, radio, checkbox
        Preferences = require('preferences'),   // Manages encryped preferences      
        GitHubApi   = require('github'),        // github api wrapper for nodeJS
        _           = require('lodash'),        //
        touch       = require('touch'), 
        chalk       = require('chalk'),         // Coloring the console
        git         = require('simple-git')();  // git-simple package exports method that needs to be called


    var Spinner     = CLI.Spinner;
// With this in place we can start developing cli app

 /**
 * This works when calling APP from the same dir, ie node index.js, but bear in mind we are desiging on cli app that get installed globally
 * we want the name of dir working in, not the path of dir where app reside
 */
console.info("where app reside", path.basename( path.dirname( fs.realpathSync( __filename ) ) )  );
console.info("where app is run", process.cwd(), path.basename( process.cwd() ) );


// Promtig user for input
// Inquirer includes many methods for various types of prompts, which are roughly analogous to HTML form control

// Global instance of github, so that i can be used with subsequent call
var github = new GitHubApi({ version:'3.0.0' });
var pref = new Preferences('gitMate' /* Application identifier */ );


module.exports = {

    getCDBase() {
        return path.basename( process.cwd() );
    },

    dirExists( filepath ) {  // fs.stat/fs.statSync throws error if there is not file so let use try-catch
        try {
            return fs.statSync( filepath ).isDirectory();
        }
        catch( err ) {            
            return false;
        }
    },

    getGitHubCred( callback ){
        var ques = [
            {
                "name":"username", type:'input', message:"Enter github username or e-mail address",
                validate(val){ 
                    if( val.length ) 
                        return true;
                    else 
                        return "Enter your username or email address"
                }
            },
            {
                name:"password", type:'password', message : "Enter your password" ,
                validate(val){
                    if( val.length ) 
                        return true;
                    else 
                        return "Please enter your password"
                }
            }
        ];
        // Inquirer asks a seriese of questions
        inquirer.prompt( ques ).then( callback );
    },

    getGitubToken( callback ) {
        // Dealing with git authentications    
        // If a prefs object exists and it has github and github.token properties, this means that there is already a token in storage.    
        if( pref.github && pref.github.token ){
            console.log( chalk.green("You are allready authenticated :)") );
            return callback( null, pref.github.token );
        }

        // Authenticating from github
        utils.getGitHubCred(function( creds ){
            var spinner = new Spinner("Authenticating "+creds.username+", please wait...");
            spinner.start();

            github.authenticate( _.extend({type:'basic'}, creds) );
            github.authorization.create({
                scopes:['user','public_repo','repo','repo:status'],
                note: 'gitMate, the command-line tool for initializing Git repository +' },
                function(err, res){
                    spinner.stop();
                            
                    if( err )
                        return callback(err);
                    if( res !== undefined ){
                        pref.github = { token:res.data.token };
                        return callback(null, res.data.token );
                    }
                });
        });
    },

    createRepo( callback ){
        // This only really scratches the surface of the minimist package. You can also use it to intepret flags, switches and name/value pairs.
        var argv = require("minimist")( process.argv.slice(2) );
        
        var q = [
            {
                type:'input', name:'name', message:'Enter your repo name :', default:argv._[0] || this.getCDBase(),
                validate(val){
                    return val.length ? true : "Enter repo name : ";
                }
            },
            {
                type:'input', name:'description', default:argv._[1] || null, message : "Optionally enter a description of repository"               
            },
            {
                type:'list', name:'visibility', message:'Public or Private', choices:['public','private']  , default:'public'
            }
        ];

        // Asking questions to inquirer
        inquirer.prompt( q ).then(function(ans){
            var spinner = new Spinner("Creating repository...");
                spinner.start();

                var d = {
                    name:ans.name,
                    description:ans.description,
                    private: ans.visibility === true
                };

                github.repos.create( d, (err, res) => {
                    spinner.stop();
                    return err ? callback(err) : callback(null, res.data.ssh_url);
                })
        });
    },

    createGitIgnore( callback ){
        // Scanning the current directory, ignoring .git and .gitignore files
        var fileList = _.without( fs.readdirSync('.') ,'.git', '.gitignore' );
        if( fileList.length ){
            // Lets utilise Inquirer checkbox widget
            var q = [
                { 
                    name:'ignore', type:"checkbox", message:"Elect the files/folders you wish to ignore : ", 
                    choices: fileList,
                    default:['node_modules', 'bower_components']
                }
            ];

            inquirer.prompt( q ).then( ans => {
                if( ans.ignore.length )
                    fs.writeFileSync('.gitignore', ans.ignore.join('\n') );
                else
                    touch('.gitignore');
                
                return callback();
            });
        }
        else {
            // lets simply touch the current .gitignore file and bail out of the function
            touch(".gitignore");
            return callback();
        }
    },

    setupRepo( url, callback ){
        var spinner = new Spinner("Setting up the repository ...");
            spinner.start();

            git
                .init() // initialize or reinitialize git local repository
                .add("./gitignore").add("./*")
                .commit("My first commit :)")
                .addRemote("origin", url)
                .push("origin","master")
                .exec(function(){
                    spinner.stop();
                    return callback();
                });
    },


    gitHubAuth( callback ){
        this.getGitubToken( (err, token ) => {
            if( err )
                return callback( err );
            
            var type  = "oauth";
            github.authenticate({ type, token });
            return callback( null, token );
        });
    },

    noop(){}

}






