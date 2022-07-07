const{executeNonQuery:executeNonQuery,executeReader:executeReader}=require("../db/db.util"),{validateJid:validateJid}=require("../common/common.util"),getContactById=async e=>{try{e=validateJid(e);const t="SELECT id, cast(name AS CHAR) AS name, CAST(pushName AS CHAR) AS pushname, verifiedname \n                     FROM contacts \n                     WHERE id = ?";return(await executeReader(t,[e]))[0]}catch(e){console.log(`getContactById::ex: ${e}`)}},getContacts=async()=>{try{const e="SELECT id, cast(name AS CHAR) AS name, CAST(pushname AS CHAR) AS pushname, verifiedname \n                     FROM contacts \n                     WHERE isgroup = 0\n                     ORDER BY name";return await executeReader(e)}catch(e){console.log(`getContacts::ex: ${e}`)}},existContact=async e=>{try{e=validateJid(e);const t="SELECT COUNT(*) as count\n                     FROM contacts\n                     WHERE id = ?";return(await executeReader(t,[e]))[0].count>0}catch(e){console.log(`existContact::ex: ${e}`)}return!1},addEditContact=async e=>{try{let t=void 0;const a=validateJid(e.id);if(await existContact(a)){const n=[e.name,e.pushname,e.verifiedname,a];t="UPDATE contacts SET name = ?, pushname = ?, verifiedname = ?\n                   WHERE id = ?";await executeNonQuery(t,n)}else{const n=[a,e.name,e.pushname,e.verifiedname,e.isgroup];t="INSERT INTO contacts (id, name, pushname, verifiedname, isgroup)\n                   VALUES (?, ?, ?, ?, ?)";await executeNonQuery(t,n)}}catch(e){console.log(`contacts: ${JSON.stringify(contacts)}`),console.log(`addEditContact::ex: ${e}`)}};module.exports={addEditContact:addEditContact,existContact:existContact,getContactById:getContactById,getContacts:getContacts};