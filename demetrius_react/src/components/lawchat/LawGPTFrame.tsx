import React, { useEffect, useState, useRef } from 'react';
import SideChatList from "./SideChatList";
import ChatView from "./ChatView";
import { removeChatRequest, type RowKeys, type RowValues } from "../../requests/request";
import $ from 'jquery'
import { Add, TrashCan, SidePanelCloseFilled } from '@carbon/icons-react';
import { Modal, Button } from "@carbon/react";
// @ts-ignore
import { Layer } from "@carbon/react";
import './LawGPTFrame.scss'
import { emptyChat } from "../../requests/request";
import type { Chat, Message } from "../../requests/request";

interface LawGPTFrameProps {
	hiddenFrame: boolean;
	chats: Chat[] | null;
	lawCollections: string[]|null;
	username: string;
	userPriviliges: string;
	setChats: (chats: Chat[]) => void;
}

const LawGPTFrame: React.FC<LawGPTFrameProps> = ({ hiddenFrame, userPriviliges, chats, lawCollections, username, setChats }) => {
	const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [userChatInput, setUserChatInput] = useState<string>("");
  const [selectedGPTModel, setSelectedGPTModel] = useState<string>("gpt-4-1106-preview");
  const [contextRedondancy, setContextRedondancy] = useState<boolean>(true);

	useEffect(() => {
		if (chats == null) {
			setChats([Object.assign({}, emptyChat)]);
		} else if (Object.keys(chats).length == 0) {
			setCurrentChat(Object.assign({}, emptyChat));
		} else if (currentChat == null) {
			setCurrentChat(chats![chats!.length - 1]);
		} else if (currentChat.id == null) {
			setCurrentChat(chats![Object.keys(chats)[Object.keys(chats).length - 1] as unknown as number]);
		} else {
      if (currentChat.id == "") {
        setCurrentChat(chats![chats!.length - 1]);
        return;
      }
      for (let chat of chats!) {
        if (chat.id == currentChat.id) {
					setCurrentChat(chat);
					return;
				}
      }
		}
	}, [chats]);

	function handleSelectChat(chat: Chat) {
		setCurrentChat(chat);
	}

	function handleNewChat() {
		const newChat = Object.assign({}, emptyChat);
		setCurrentChat(newChat);
    const new_chats = [...chats!, newChat];
		setChats(new_chats);
	}

  function removeChat(chatToRemove: Chat) {
    removeChatRequest(chatToRemove).then((chats) => {
			setChats(chats!);
			setCurrentChat(chats![0]);
		});
  }

  if (hiddenFrame) {
    return <></>
  }

	return (
		<>
			<SideChatList chats={chats} onSelectChat={handleSelectChat} onNewChat={handleNewChat} removeChat={removeChat} />
			{currentChat != null ? (
				<ChatView selectedGPTModel={selectedGPTModel} setSelectedGPTModel={setSelectedGPTModel} contextRedondancy={contextRedondancy} setCurrentChat={setCurrentChat} setContextRedondancy={setContextRedondancy} userChatInput={userChatInput} setUserChatInput={setUserChatInput} lawCollections={lawCollections} setChats={setChats} currentChat={currentChat} username={username} />
			) : (
				<></>
			)}
		</>
	);
};

export default LawGPTFrame;