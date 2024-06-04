import React from "react";
import { useState, useEffect } from "react";
import { Close } from "@carbon/icons-react";
import { Layer, Button, ExpandableSearch, TextInputSkeleton } from "@carbon/react";
import { Add, TrashCan, SidePanelCloseFilled } from "@carbon/icons-react";
// @ts-ignore
import { ContainedList, ContainedListItem } from "@carbon/react";
import $ from "jquery";

import "./SideChatList.scss";

import type { Chat, Message } from "../../requests/request";


export interface ChangeEvent {
  target: HTMLInputElement;
  type: "change";
}

interface SideChatListProps {
	chats: Chat[] | null;
	onSelectChat: (chat: Chat) => void;
	onNewChat: (e: any) => void;
	removeChat: (e: any) => void;
}

const SideChatList: React.FC<SideChatListProps> = ({ chats, onSelectChat, onNewChat, removeChat }) => {
	const [searchTerm, setSearchTerm] = useState<string>("");
	const [searchResults, setSearchResults] = useState<Chat[]>([]);
  const [confirmationText, setConfirmationText] = useState<string>("");
  const [chatToRemove, setChatToRemove] = useState<Chat|null>(null);

	const expandableSearch = <ExpandableSearch placeholder="Filter" labelText="" value={searchTerm} onChange={(e) => handleChange(e)} closeButtonLabelText="Clear search input" size="lg" />;
	let results = [] as Chat[];

  function filterChats(chats: Chat[], searchTerm: string): Chat[] {
    let results = [] as Chat[];
    for (const [key, value] of Object.entries(chats)) {
      const id = key as unknown as number;
      const chat = value as unknown as Chat;
			if (chat.name.toLowerCase().includes(searchTerm.toLowerCase())) {
				results.push(chat);
			}
		}
    return results;
  }
  
	useEffect(() => {
		if (chats == null) return;
		results = filterChats(chats, searchTerm)
    results.sort(function (chata, chatb) {
      if (chata.id == null) return -1;
      if (chatb.id == null) return 1;
			return -((new Date(chatb.id) as unknown as number) - (new Date(chata.id) as unknown as number));
		});
		setSearchResults(results);
	}, [searchTerm, chats]);

	function handleChange(event: ChangeEvent) {
		setSearchTerm(event.target.value);
	}

  function closePopupIfOutside(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    // @ts-ignore
    if (e.target!.className == "popup-background") {
      setConfirmationText("");
    }
  }

  function handleConfirmRemoveChat(e: React.MouseEvent<HTMLButtonElement, MouseEvent>|null, chat: Chat|null) {
    if (e != null) {
      setChatToRemove(chat);
			setConfirmationText("Are you sure you want to delete this chat ?");
		} else {
      removeChat(chatToRemove!);
    }
  }

	return (
		<Layer className="side-menu-container">
			{confirmationText.length > 0 ? (
				<div className="popup-background" onClick={closePopupIfOutside}>
					<div className="confirmation-popup">
						<h1 className="popup-title">{confirmationText}</h1>
						<div className="popup-button-container">
							<Button kind="tertiary" onClick={() => setConfirmationText("")}>
								Cancel
							</Button>
							<Button
								kind="danger--tertiary"
								renderIcon={TrashCan}
								onClick={(e) => {
									setConfirmationText("");
									handleConfirmRemoveChat(null, null);
								}}
							>
								Delete
							</Button>
						</div>
					</div>
				</div>
			) : (
				<></>
			)}
			<Layer className="side-menu">
				<Button kind="secondary" className="new-chat-button" onClick={onNewChat}>
					New Chat
				</Button>
				<ContainedList type="" label="Chat list" className="chat-list" action={expandableSearch}>
					{chats == null
						? [...Array(5)].map((e, i) => {
								return (
									<ContainedListItem type="" id={i} key={i}>
										<TextInputSkeleton hideLabel />
									</ContainedListItem>
								);
						  })
						: searchResults.map((chat, i) => {
								return (
									<ContainedListItem key={i} onClick={(e: any) => onSelectChat(chat)}>
										<div className="chat-list-item">
											<div className="chat-name-container">
												<h4 className="chat-creation">{chat.creation_date == "" ? "Now" : new Date(chat.creation_date).toLocaleString()}</h4>
												<h3 className="chat-name">{chat.name == "" ? "<New chat>" : chat.name}</h3>
											</div>
											<Button kind="ghost" size="sm" hasIconOnly onClick={(e) => handleConfirmRemoveChat(e, chat)} iconDescription="remove" renderIcon={Close} />
										</div>
									</ContainedListItem>
								);
              }
						  )}
				</ContainedList>
			</Layer>
		</Layer>
	);
};

export default SideChatList;
