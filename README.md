# SalesforceOrgBackUp

This repo contains the files for retrieving the entire metadata(supported by Metadata API)  from Salesforce org ( the org should be configured/Authorized in SFDX already). 

<b>Sample usecase: </b> <br/>
This can be helpful for taking backup of entire ORG. 
This can be used for taking ORG backup during sandbox refresh process so that we do not lose any data accidentally.


<b> Technical Design </b> <br/>
The code works completely based on the native sfdx commands integrated with node.js via Shelljs(npm module). 


<b> How to Retrieve Metadata for the entire ORG ?? </b> 
1. Download/Clone the git repo. 
2. Navigate to the downloaded folder from terminal/command prompt. (cd directoryurl)
3. Run the command npm install --save. This will install the npm modules.
4. run the below command and follow the steps. 
<b> node index.js </b>

After running the above command , the below question will be displayed. Press Y and enter. <br/>
<b>Do you want to Retrieve the full backup of Org??(Y/N)</b> : Y <br/>
<b> Please enter the SFDX Configured UserName for Full backup </b> : sampletest@test.com.org (<i> Please note, this username should already be configured in sfdx </i> ) <br/>

After entering the username , the Metadata Retrieval will start. <br/>
<img src="https://github.com/ravi0389/SalesforceOrgBackUp/blob/main/screenshots/Retrieval1.png"> </img>

This will take time based on the total amount of metadata present in the org. 

After all the metadata retrieval is completed , we will be able to find the metadata inside of folder <b>RetrievedFiles</b> in the same directory.

<b> <center> How to Search for a String in the downloaded Metadata ??  </center> </b>  <br/>
<b> <i> Please note , the Search functionality will only be applicable after the metadata is downloaded </i> </b>

<b>Do you want to Retrieve the full backup of Org??(Y/N)</b> : N <br/>
<b> Please enter the text to search.(Please note this string will be searched on the retrieved metadata. If you do not have metadata downloaded already , please cancel by pressing enter and download metadata from step1 </b> : Demo (Please enter the string to be searched here )<br/>

This will start searching for the given keyword in the downloaded metadata files and generate a csv report with the search results. The csv report can be found inside of the folder Search Results.
