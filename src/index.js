require("dotenv").config();const path=require("path"),fs=require("fs"),qrcodeTerminal=require("qrcode-terminal"),qr=require("qr-image"),qrcode=qr,P=require("pino"),{SESSION_ID:SESSION_ID}=process.env,SESSION_FILE_PATH=path.join(path.resolve("./session"),`${SESSION_ID}.json`),QRCODE_FILE_PATH=path.join(path.resolve("./session"),`qr_code_${SESSION_ID}.png`),{useSingleFileAuthState:useSingleFileAuthState,DisconnectReason:DisconnectReason,fetchLatestBaileysVersion:fetchLatestBaileysVersion}=require("@adiwajshing/baileys"),makeWASocket=require("@adiwajshing/baileys").default,{state:state,saveState:saveState}=useSingleFileAuthState(SESSION_FILE_PATH),{getContactById:getContactById}=require("./db.repository/contacts.repository"),{onSendMessageHandler:onSendMessageHandler,onBroadcastMessageHandler:onBroadcastMessageHandler,onGetUnreadMessageHandler:onGetUnreadMessageHandler,onGetAllMessageHandler:onGetAllMessageHandler}=require("./signalr.event.handler/messages.handler"),{onGrabGroupHandler:onGrabGroupHandler,onGrabGroupAndMemberHandler:onGrabGroupAndMemberHandler,onGrabContactHandler:onGrabContactHandler}=require("./signalr.event.handler/grab.handler"),{onArchiveChatHandler:onArchiveChatHandler}=require("./signalr.event.handler/chats.handler"),{onVerifyWANumberHandler:onVerifyWANumberHandler,onDisconnectHandler:onDisconnectHandler,onLogoutHandler:onLogoutHandler,onGetCurrentStateHandler:onGetCurrentStateHandler}=require("./signalr.event.handler/common.handler"),{chatsSet:chatsSet,chatsUpdate:chatsUpdate,chatsUpsert:chatsUpsert}=require("./sock.event.handler/chats.handler"),{contactsSet:contactsSet,contactsUpdate:contactsUpdate,contactsUpsert:contactsUpsert}=require("./sock.event.handler/contacts.handler"),messagesSet=require("./sock.event.handler/messages.set.handler"),messagesUpdate=require("./sock.event.handler/messages.update.handler"),messagesUpsert=require("./sock.event.handler/messages.upsert.handler"),groupsParticipantsUpdate=require("./sock.event.handler/group.handler"),{waitFor:waitFor,findVal:findVal}=require("./common/common.util"),{signalRClient:signalRClient,serverHub:serverHub}=require("./signalr/signalr.util");let _sock=void 0,_currentWaNumber=void 0,_currentState="unknown";const connectedHandler=async()=>{try{console.log("SignalR client connected.");const e="- Initialize...";signalRClient.connection.hub.invoke(serverHub,"Startup",JSON.stringify({message:e,sessionId:SESSION_ID})),console.log(e),(_sock=await connectToWhatsApp())&&registerCallBack(_sock)}catch(e){console.error("initialize error ...."),signalRClient.connection.hub.invoke(serverHub,"Startup",JSON.stringify({message:new String(e),sessionId:SESSION_ID}))}};signalRClient.start(),signalRClient.on("connected",connectedHandler),signalRClient.on("reconnecting",e=>{console.log(`SignalR client reconnecting(${e}).`)}),signalRClient.on("disconnected",e=>{console.log(`SignalR client disconnected(${e}).`)}),signalRClient.on("error",(e,n)=>{console.log(`SignalR client connect error: ${e}.`),setTimeout(()=>process.exit(),500)}),signalRClient.connection.hub.on(serverHub,"OnSendMessage",e=>{onSendMessageHandler(e,_sock)}),signalRClient.connection.hub.on(serverHub,"OnBroadcastMessage",(e,n)=>{onBroadcastMessageHandler(e,n,_sock)}),signalRClient.connection.hub.on(serverHub,"OnVerifyWANumber",(e,n)=>{onVerifyWANumberHandler(e,n,_sock)}),signalRClient.connection.hub.on(serverHub,"OnGrabContact",e=>{onGrabContactHandler(e,_currentWaNumber)}),signalRClient.connection.hub.on(serverHub,"OnGrabGroup",e=>{onGrabGroupHandler(e,_sock)}),signalRClient.connection.hub.on(serverHub,"OnGrabGroupAndMember",e=>{onGrabGroupAndMemberHandler(e,_sock)}),signalRClient.connection.hub.on(serverHub,"OnArchiveChat",e=>{onArchiveChatHandler(e,_sock)}),signalRClient.connection.hub.on(serverHub,"OnGetCurrentState",e=>{onGetCurrentStateHandler(e,_currentState)}),signalRClient.connection.hub.on(serverHub,"OnGetUnreadMessage",e=>{onGetUnreadMessageHandler(e,_currentWaNumber,_sock)}),signalRClient.connection.hub.on(serverHub,"OnGetAllMessage",e=>{onGetAllMessageHandler(e,_currentWaNumber)}),signalRClient.connection.hub.on(serverHub,"OnDisconnect",e=>{onDisconnectHandler(e,_sock)}),signalRClient.connection.hub.on(serverHub,"OnLogout",e=>{onLogoutHandler(e,_sock)});const connectToWhatsApp=async()=>{return makeWASocket({logger:P({level:"warn"}),auth:state})},registerCallBack=e=>{e.ev.on("chats.set",chatsSet),e.ev.on("chats.update",chatsUpdate),e.ev.on("chats.upsert",chatsUpsert),e.ev.on("contacts.set",contactsSet),e.ev.on("contacts.update",contactsUpdate),e.ev.on("contacts.upsert",contactsUpsert),e.ev.on("messages.set",messagesSet),e.ev.on("messages.update",e=>{messagesUpdate(e,_currentWaNumber)}),e.ev.on("messages.upsert",n=>{messagesUpsert(n,_currentWaNumber,e)}),e.ev.on("connection.update",connectionUpdate),e.ev.on("creds.update",e=>{saveState();const n="- Authenticated";console.log(n),fs.existsSync(QRCODE_FILE_PATH)&&fs.unlink(QRCODE_FILE_PATH,e=>{e&&console.log(e)}),signalRClient.connection.hub.invoke(serverHub,"Startup",JSON.stringify({message:n,sessionId:SESSION_ID}))}),e.ev.on("group-participants.update",groupsParticipantsUpdate),e.ws.on("CB:call",async e=>{if(console.log("================ CALL ========================="),console.log(`json message call: ${JSON.stringify(e)}`),e.tag&&"call"===e.tag){const{id:n,from:t,t:s}=e.attrs;let o=void 0;try{o=await getContactById(t)}catch(e){console.log(`getContactById::ex: ${e}`)}const r=_currentWaNumber,a={id:n,sessionId:SESSION_ID,type:"call_log",from:t||"",to:r||"",sender:{id:o.id?o.id:"",name:o.name?o.name:"",shortName:"",pushname:o.pushName?o.pushName:""},unixTimestamp:s||0};signalRClient.connection.hub.invoke(serverHub,"ReceiveMessage",JSON.stringify({message:a,sessionId:SESSION_ID}))}})},reConnectToWhatsApp=async()=>{try{_sock&&_sock.ws.terminate(),(_sock=await connectToWhatsApp())&&registerCallBack(_sock)}catch(e){console.log(`ex: ${e}`)}},connectionUpdate=async e=>{console.log("=========== connection.update ========="),console.log(`connectionState: ${JSON.stringify(e)}`),console.log("");const{connection:n,lastDisconnect:t,qr:s}=e;if(_currentState=n||"unknown","close"===n){_currentState=n,signalRClient.connection.hub.invoke(serverHub,"ChangeState",JSON.stringify({state:_currentState,sessionId:SESSION_ID}));let s=!1;if(t.error.output.statusCode&&(s=t.error.output.statusCode!==DisconnectReason.loggedOut),s)try{_currentState="connecting",signalRClient.connection.hub.invoke(serverHub,"ChangeState",JSON.stringify({state:_currentState,sessionId:SESSION_ID})),await reConnectToWhatsApp()}catch(e){console.error("initialize error ...."),signalRClient.connection.hub.invoke(serverHub,"Startup",JSON.stringify({message:new String(e),sessionId:SESSION_ID}))}else{let n=void 0,t=void 0;e&&(n=findVal(e,"type"),t=findVal(e,"message")),"device_removed"!==n&&"Intentional Logout"!==t&&"Connection Failure"!==t||(console.log("remove session file"),console.log(),removeSessionFile()),_currentState="close",signalRClient.connection.hub.invoke(serverHub,"ChangeState",JSON.stringify({state:_currentState,sessionId:SESSION_ID})),signalRClient.connection.hub.invoke(serverHub,"Startup",JSON.stringify({message:_currentState,sessionId:SESSION_ID}))}}else if("open"===n){const{id:e}=_sock.user,t=e.split("@"),s=t[0].split(":")[0];_currentWaNumber=`${s}@${t[1]}`;let o="- WhatsApp Client Library for .NET Developer";console.log(o),signalRClient.connection.hub.invoke(serverHub,"Startup",JSON.stringify({message:o,sessionId:SESSION_ID})),o=`- Copyright (C) 2020-${(new Date).getFullYear()}. Kamarudin`,console.log(o),signalRClient.connection.hub.invoke(serverHub,"Startup",JSON.stringify({message:o,sessionId:SESSION_ID})),o="- http://wa-net.coding4ever.net/",console.log(o),signalRClient.connection.hub.invoke(serverHub,"Startup",JSON.stringify({message:o,sessionId:SESSION_ID}));const{version:r}=await fetchLatestBaileysVersion();o=`- WhatsApp Web version ${r[0]}.${r[1]}.${r[2]}`,console.log(o),signalRClient.connection.hub.invoke(serverHub,"Startup",JSON.stringify({message:o,sessionId:SESSION_ID})),o=`- Current Phone Number:${s}`,console.log(o),signalRClient.connection.hub.invoke(serverHub,"Startup",JSON.stringify({message:o,sessionId:SESSION_ID})),await waitFor(4e3),o="- Ready",console.log(o),signalRClient.connection.hub.invoke(serverHub,"Startup",JSON.stringify({message:o,sessionId:SESSION_ID})),_currentState=n,signalRClient.connection.hub.invoke(serverHub,"ChangeState",JSON.stringify({state:_currentState,sessionId:SESSION_ID}))}if(s){qrcodeTerminal.generate(s,{small:!0});const e="- Scan QRCode...";console.log(e);const n=qrcode.imageSync(s,{type:"png"});fs.writeFileSync(QRCODE_FILE_PATH,n),signalRClient.connection.hub.invoke(serverHub,"Startup",JSON.stringify({message:e,sessionId:SESSION_ID})),signalRClient.connection.hub.invoke(serverHub,"ScanMe",JSON.stringify({qrcodePath:QRCODE_FILE_PATH,sessionId:SESSION_ID}))}},removeSessionFile=()=>{if(fs.existsSync(SESSION_FILE_PATH))try{fs.rm(SESSION_FILE_PATH,{force:!0},e=>{e&&console.log(e)})}catch(e){console.log(`err: ${e}`)}};