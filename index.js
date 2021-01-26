//used for executing SFDX Commands
let shell = require('shelljs');

//used for formatting the logs 
const chalk = require('chalk');
const log = console.log;

//used for creating folders + files
let fse= require('fs-extra');

//Since metadata api retrieves in ZIP , the below npm module is used for unzipping/extraction
const extract = require('extract-zip')

//Convert JSON to CSV 
let jsonexport = require('jsonexport');

//Standard Node.js File system Module for reading directories and the files
const fs = require('fs');

//Prompt the user to enter the option to search /retrieve the full backup
const prompts = require('prompts');

var finalPackageXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n';
finalPackageXml +=  '   <Package xmlns="http://soap.sforce.com/2006/04/metadata">\r\n';


        //-----------------Prompt Questions----------------
                const step1 = [
                        {
                                type: 'text',
                                name: 'isSearch',
                                message: 'Do you want to Retrieve the full backup of Org??(Y/N)'
                        }
                        ];

                const step1Y= [{
                        type: 'text',
                        name: 'username',
                        message: 'Please enter the SFDX Configured UserName for Full backup'
                }];

                const step1N = [ {
                        type: 'text',
                        name: 'searchtext',
                        message: 'Please enter the text to search.(Please note this string will be searched on the retrieved metadata. If you do not have metadata downloaded already , please cancel by pressing enter and download metadata from step1)'
                }];


   //Describe metadata for getting all the metadata types             
   function getMetadataTypes(userName){
        return new Promise(async (resolve, reject) => {
                    let metadataTypes = [];
                    let result = shell.exec('sfdx force:mdapi:describemetadata --json -u '+userName,{silent:true}).stdout;
                    var data = JSON.parse(result,true);

                    if(!data.result){
                        console.log(data);
                        resolve('Error');
                    }
                    else{
                        for(var item of data.result.metadataObjects){

                                if(item.childXmlNames && item.childXmlNames.length > 0 && item.xmlName == 'CustomLabels'){
                                        for(var child of item.childXmlNames){
                                                metadataTypes.push(child);                     
                                        }
                                }else{
                                         metadataTypes.push(item.xmlName);
                                }
                        }

                                resolve(metadataTypes);
                    }
        });
    }


    //Get the list of metadata items for the given metadata type
    function getMetadataListItems(userName,metadataType,folderName){
        return new Promise(async (resolve, reject) => {
                    let metadatas = [];
                    let result = [];

                    if(folderName){
                        result = shell.exec('sfdx force:mdapi:listmetadata --json -u '+userName+' -m '+metadataType+' --folder '+folderName,{silent:true}).stdout;
                    }

                    else{
                        result = shell.exec('sfdx force:mdapi:listmetadata --json -u '+userName+' -m '+metadataType,{silent:true}).stdout;
                    }
                       
                    var data = JSON.parse(result,true);
                    resolve(data);

        });
    }

    //Retrieve the Metadata for the given Package.xml
    function retrieveMetadata(userName){

        return new Promise(async (resolve, reject) => {
                shell.exec('sfdx force:mdapi:retrieve -r ./RetrievedFiles -u '+userName+' -k ./package.xml',{ }).stdout;
                resolve();

        });
    }

    //List down all the folders in the org. EmailTemplates,Report,Dashboard need folder for retrieving the metadata.
    function getFolders(userName){
        return new Promise(async (resolve, reject) => {
                var cmd = 'sfdx force:data:soql:query --json -q "SELECT id,Name,DeveloperName,Type from Folder"  -u '+userName;
                let result = shell.exec(cmd,{silent:true}).stdout;
                var data = JSON.parse(result,true);
                resolve(data.result.records);
        });
    }

    (async()=>{


        //---------------------Prompt for getting the user desicion------------------
        let response = await prompts(step1);
        let userName,searchText;
        let typeWithFolders = new Map();
        let answer = response.isSearch;


        //------------Full Retrieval of the Org-----------------
        if(response.isSearch === 'Y'){
                 response = await prompts(step1Y);
                 userName = response.username;
                 log(chalk.black.bold.green('Getting the list of folders via SOQL'));
                 let folders = await getFolders(userName);
         
                 //Generate a map of Type and the associated folders.
                 for(var item of folders){
         
                         if(item.Type == 'Email') //Email is the type of folder . but the related metadata name is EmailTemplate
                                 item.Type = 'EmailTemplate';
         
                         var existingFolders = [];
         
                         if(typeWithFolders.has(item.Type))
                                 existingFolders = typeWithFolders.get(item.Type);
         
                         existingFolders.push(item.DeveloperName);
         
                         typeWithFolders.set(item.Type,existingFolders)
                 }
         
         

        }
         //------------Get the String to Search from the User-----------------
         else{
                 response = await prompts(step1N);
                 searchText = response.searchtext;
        }


        if(!searchText && !userName){
                if(answer === 'Y')
                         log(chalk.black.bold.redBright('UserName Cannot be Empty. Please try again !!'));
                else
                          log(chalk.black.bold.redBright('Search String Cannot be Empty. Please try again !!!'));
                return;
        }

        if(!searchText){
                resolve = require('path').resolve
                var absoluteUrl = resolve('./RetrievedFiles');

                log(chalk.black.bold.green('Full backup is Starting .....'));


                let metadataTypes = await getMetadataTypes(userName);

                if(!Array.isArray(metadataTypes)){
                        log(chalk.black.red.bold('An Unexpected error Occured. Please contact ravi0389@gmail.com'));
                                return;

                }
            log(chalk.black.bold.green('Describe Metadata is Completed'));
            var count = 0; 
            for(var item of metadataTypes){

                    count += 1;

                   log(chalk.black.green('Listing Metadata For In Progress',item));
                   log(chalk.black.green('Pending Metadata Count :: ',metadataTypes.length - count));
      
                        var toProcessItems = [];

                        if(typeWithFolders.has(item)){
                                for(var folder of typeWithFolders.get(item)){
                                        toProcessItems.push(folder);
                                }
                        }
                        else{
                                toProcessItems.push(item);
                        }

                        /*For a given metadatatype, there may be different folders. So iterating the folders in a loop. For metadata that do not have any folder this list will contain 
                        only the metadata item*/
                        for(var folder of toProcessItems){

                                var localpackage = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n';
                                localpackage +=  '   <Package xmlns="http://soap.sforce.com/2006/04/metadata">\r\n';
                
                                
                                var key = item; //used for displaying the logs to the user.
                                
                                var isFolder = false;

                                if(folder != item){  //this is for the metadata with folders associated to it
                                        key = item+'/'+folder;
                                        isFolder = true;
                                }
                                
                                var outputOfListMetadata = await getMetadataListItems(userName,item,isFolder ? folder : ''); //Get the list of metadata items
                                var data = outputOfListMetadata.result;

                                if(!data)
                                        continue;
                                        
                                if(!Array.isArray(data)){
                                        data = [];
                                        data.push(outputOfListMetadata.result);
                                }

                                //generate the package.xml

                                localpackage += '        <types>\r\n';
                                for(var mem of data){
                                        localpackage +=  '        <members>'+mem.fullName+'</members>\r\n';
                                }

                                localpackage +=  '        <name>'+item+'</name>\r\n';
                                localpackage +=  '        </types>\r\n'; 

                                //This contains the final package version of the entire org.
                                finalPackageXml += localpackage.replace('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n   <Package xmlns="http://soap.sforce.com/2006/04/metadata">\r\n','');

                                localpackage += '    <version>50.0</version>\r\n';
                                localpackage += '    </Package>';
                                fse.outputFileSync('package.xml',localpackage);

                                log(chalk.black.bold.green('==========Retrieval Starting for '+key+'============='));
                                        await retrieveMetadata(userName);
                                        await extract(absoluteUrl+'/unpackaged.zip', { dir: absoluteUrl});
                                log(chalk.black.bold.green('==========Retrieval Completed for '+key+'============='));            
                        }

            }

            finalPackageXml += '    <version>50.0</version>\r\n';
            finalPackageXml += '    </Package>'

            
            log(chalk.black.green('All Done!!'));
            fse.outputFileSync('finalpackage.xml',finalPackageXml);
        }

        else{

                log(chalk.black.bold.green('Starting to Search for the keyword ',searchText));
                 let files = fs.readdirSync('./RetrievedFiles/unpackaged/');
                 var searchResults = [];
                 for(var item of files){
                         if(item != '.DS_Store' && item != 'package.xml'){
                                let metadataFiles = fs.readdirSync('./RetrievedFiles/unpackaged/'+item);
                                for(var metadata of metadataFiles){

                                        if(!metadata.includes('.'))
                                                        continue;

                                        var data = fs.readFileSync('./RetrievedFiles/unpackaged/'+item+'/'+metadata);
                                        if(data.toString().toLowerCase().includes(searchText.toLowerCase())){

                                                        var index = data.toString().toLowerCase().indexOf(searchText.toLowerCase()); 
                                                        var tempString = data.toString().substring(0, index);
                                                        var lineNumber = tempString.split('\n').length;

                                                        var searchResult = {};
                                                        searchResult.FileName = metadata;
                                                        searchResult.Folder = item;
                                                        searchResult.LineNumber = lineNumber;
                                                        searchResults.push(searchResult);

                                        }
                                               
                                }
                         }
                                      
                 }


                 jsonexport(searchResults, function(err, csv){ 
                        if (err) return console.error(err);
                        fse.outputFileSync('SearchResults/SearchText-'+searchText+'.csv',csv);
                       
                 });


        }

    })();
