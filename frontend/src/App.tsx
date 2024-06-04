import React, { useEffect, useState } from "react";
import LawGPTFrame from "./components/lawchat/LawGPTFrame";
import LawsFrame from "./components/lawspage/LawsFrame";
import "./App.scss";
import './fonts.css'
import Login from "./components/loginpage/LoginSection";
import JudgementFrame from "./components/judgementspage/JudgementsFrame";
import { Layer, TileGroup, ClickableTile, Button, IconButton } from "@carbon/react";
import { SidePanelClose, SidePanelOpen, User } from "@carbon/icons-react";
// @ts-ignore
import { TreeView, TreeNode } from "@carbon/react";
import { chatListRequest, fetchJudgmentsRequest, fetchLawCollectionsRequest, logout } from "./requests/request";
import AccountsFrame from "./components/accountspage/AccountsFrame";
import type { Chat, Judgment } from './requests/request';

const App: React.FC = () => {
	const [isloggedin, setLoggedin] = useState<boolean>(false);
	const [sideCollapsed, setSideCollapsed] = useState<boolean>(false);
  const [confirmationText, setConfirmationText] = useState<string>("");
  const [mode, setMode] = useState<"chats" | "judgments" | "laws" | "accounts">("chats");
  const [username, setUsername] = useState<string>('');
  const [userPriviliges, setUserPriviliges] = useState<string>("");
  const [chats, setChats] = useState<Chat[]|null>(null);
  const [judgments, setJudgments] = useState<Judgment[]|null>(null);
  const [lawCollections, setLawCollections] = useState<string[]|null>([]);

  const logingin = () => {
    setLoggedin(true);
  }

  useEffect(() => {
    (async function fetchData1 () {
      setChats(await chatListRequest());
    })();
    (async function fetchData2 () {
      setJudgments(await fetchJudgmentsRequest(''));
    })();
    (async function fetchData3 () {
      setLawCollections(await fetchLawCollectionsRequest());
    })();
  }, [isloggedin]);

  function showDisconnect() {
    setConfirmationText(`Are you sure you want to disconnect from ${username}?`);
  }
  
  if (isloggedin)
    return (
			<div className="App">
				{confirmationText.length > 0 ? (
					<div className="popup-background">
						<div className="confirmation-popup">
							<h1 className="popup-title">{confirmationText}</h1>
							<div className="popup-button-container">
								<Button kind="tertiary" onClick={() => setConfirmationText("")}>
									Cancel
								</Button>
								<Button
									kind="danger--tertiary"
									onClick={() => {
										setConfirmationText("");
										logout();
										window.location.reload();
									}}
								>
									Disconnect
								</Button>
							</div>
						</div>
					</div>
				) : (
					<></>
				)}
				<Layer level={1} className={`app-side-container ${sideCollapsed ? 'to-left' : ''}`}>
					<div className="side-flex">
            <div className='collapse-button' >
              {sideCollapsed ?
                <IconButton className='collapse-button' kind='ghost' renderIcon={SidePanelOpen} label='uncollapse' onClick={(e:any) => setSideCollapsed(false)}></IconButton>
              :
                <IconButton className='collapse-button' kind='ghost' renderIcon={SidePanelClose} label='collapse' onClick={(e:any) => setSideCollapsed(true)}></IconButton>
              }
            </div>
						<div className="app-tittle-container">
							<svg id="logo" className="logo" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 710.71 652.65">
								<path d="M427.91,326.54a127.79,127.79,0,0,1-97.67,124.18,245.27,245.27,0,0,0,0-248.36A127.79,127.79,0,0,1,427.91,326.54Z" />
								<path d="M515,326.22c.21,90.08-57.92,171.52-143.28,200.33-44.69,15.08-89.53,10.08-89.53,10.08-32.65-3.82-55.37-14.86-60.44-17.4a173.85,173.85,0,0,1-55.76-44.29c28.62,9.84,77.2,31.68,107,33.87A184.54,184.54,0,0,0,295.5,510c73.77-.11,141.81-45.88,169.73-114.08,17.45-42.38,18.32-91.42,1.94-134.26C442.44,194.88,377.91,147.12,306.77,143A185.6,185.6,0,0,0,229,154.22l-63.68,23.62a184.06,184.06,0,0,1,103.91-60.18s5.8-1,12.4-1.74c16.34-1.8,72.89-1.93,120.06,22.72C471.14,174.92,515.14,247.9,515,326.22Z" />
							</svg>
							<h1 className="app-title">Demetrius</h1>
						</div>
						<TreeView level={0} className="tile-group" active="chats" label="">
							<TreeNode id="judgment" className="tree-node tile-judgment" onClick={() => setMode("judgments")} label="Judgments" />
							<TreeNode id="chats" className="tree-node tile-chats" onClick={() => setMode("chats")} label="Chats" />
							{userPriviliges == "admin" ? <TreeNode id="Accounts" className="tree-node tile-chats" onClick={() => setMode("accounts")} label="Accounts" /> : <></>}
							{userPriviliges == "admin" || userPriviliges == "editor_user" ? <TreeNode id="Laws" className="tree-node tile-chats" onClick={() => setMode("laws")} label="Laws" /> : <></>}
						</TreeView>
						<Layer className="button-account-container" level={0}>
							<Button size="xl" kind="secondary" className="button-account" renderIcon={User} onClick={showDisconnect}>
								Connected as '{username}'
							</Button>
						</Layer>
					</div>
				</Layer>
        <div className={`app-container ${sideCollapsed ? 'full-screen' : ''}`}>
          <LawGPTFrame hiddenFrame={mode != "chats"} userPriviliges={userPriviliges} lawCollections={lawCollections} setChats={setChats} username={username} chats={chats} />
          <JudgementFrame hiddenFrame={mode != "judgments"} userPriviliges={userPriviliges} setJudgments={setJudgments} judgments={judgments} />
          <AccountsFrame hiddenFrame={mode != "accounts"} />
          <LawsFrame backendCollections={lawCollections} setBackendCollections={setLawCollections} hiddenFrame={mode != "laws"} />
        </div>
			</div>
		);
  else
    return (
    <div className={`app-container ${sideCollapsed ? 'full-screen' : ''}`}>
			<div className="App login-mode">
				<Layer level={1} className="app-side-container login-mode">
					<div className="app-tittle-container login-mode">
						<svg id="logo" className="logo" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 710.71 652.65">
							<path d="M427.91,326.54a127.79,127.79,0,0,1-97.67,124.18,245.27,245.27,0,0,0,0-248.36A127.79,127.79,0,0,1,427.91,326.54Z" />
							<path d="M515,326.22c.21,90.08-57.92,171.52-143.28,200.33-44.69,15.08-89.53,10.08-89.53,10.08-32.65-3.82-55.37-14.86-60.44-17.4a173.85,173.85,0,0,1-55.76-44.29c28.62,9.84,77.2,31.68,107,33.87A184.54,184.54,0,0,0,295.5,510c73.77-.11,141.81-45.88,169.73-114.08,17.45-42.38,18.32-91.42,1.94-134.26C442.44,194.88,377.91,147.12,306.77,143A185.6,185.6,0,0,0,229,154.22l-63.68,23.62a184.06,184.06,0,0,1,103.91-60.18s5.8-1,12.4-1.74c16.34-1.8,72.89-1.93,120.06,22.72C471.14,174.92,515.14,247.9,515,326.22Z" />
						</svg>
						<h1 className="app-title">Demetrius</h1>
					</div>
					<Login setUserPriviliges={setUserPriviliges} setLoggedin={logingin} setUsername={setUsername} />
				</Layer>
			</div>
    </div>
		);
};

export default App;
