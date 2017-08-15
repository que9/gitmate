#! /usr/bin/env node
// https://www.sitepoint.com/javascript-command-line-interface-cli-node-js/

const chalk     = require('chalk'),         // Coloring the console
    clear       = require('clear'),         // Clears the screen
    CLI         = require('clui'),          // Visual components, guages, tables, spinner
    figlet      = require('figlet'),        // ASCII art from text   
    inquirer    = require('inquirer'),      // CLI UI, radio, checkbox    
    _           = require('lodash'),        // 
    fs          = require('fs'),
    path        = require("path");

const utils     = require("./libs/utils");

clear();

/**
 * Adding some helper method
 *  A. Get PWD, to default repo name
 *  B. Does dir exists if yes the look up for .git, current dir may already be the git repository
 */

 // Displaying a banner

console.log( chalk.green( figlet.textSync("gitMate - 1.0.0", {"horizontalLayout":true})) );

if( utils.dirExists('.git') ){
    console.log( chalk.red('Already git repository'));
    process.exit(1);
}

// utils.getGitubToken(function( err, token ) {
//     err ? console.log("Error : "+chalk.red(err)) : console.log( "Token : " + chalk.yellow(token) );

//     if( token ){
//         utils.createRepo(function( err, ssh_url ){
//             err ? console.log("Error : "+chalk.red(err)) : console.log( "SSH URL : " + chalk.yellow(ssh_url) );
//         });
//     }
// });

// Generating .gitignore
//utils.createGitIgnore( utils.noop );

// Interacting with Git from within the app
utils.gitHubAuth( (err, token) => {
    if( err ){
        switch( err ){
            case 401 :
                console.log( chalk.red("Could not log in, Please try again"), err );
            break;

            case 422 :
                console.log( chalk.red("You already have access token "), err );
        };
    }

    if( token ){
        console.log( chalk.green("Sucessfully authenticated :)"));
        utils.createRepo(function( err, url ){
            console.log("\n utils.createRepo ", err, url);
            if( err )
                console.log( chalk.red("Un error has occured :"), err );
            
            if( url ){
                utils.createGitIgnore(function(){
                    utils.setupRepo( url, function( err ){
                        if(!err)
                            console.log( chalk.green("All Done!"));
                    })
                });
            }
        });
    }


});