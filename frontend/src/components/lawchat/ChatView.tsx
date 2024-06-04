// ChatView.tsx
import React, { useState, useEffect } from "react";
// @ts-ignore
import { ContainedList, IconButton } from "@carbon/react";
import { TextArea } from "@carbon/react";
import { Layer, Button, TextInput, ExpandableSearch, Select, SelectItem, SelectableTile, Link, TextInputSkeleton } from "@carbon/react";
// @ts-ignore
import { InlineLoading } from "@carbon/react";
import { Send, Edit, Close, Renew, ChevronLeft, ChevronRight } from "@carbon/icons-react";
import { chatRequest, chatMessageEditRequest, chatRegenerateRequest, messageNavigation, messageNodeNavigation } from "../../requests/request";
import ReactMarkdown from 'react-markdown';

import "./ChatView.scss";

import type { Chat, Message } from "../../requests/request";
import type { ChangeEvent } from './SideChatList'
import { Checkbox } from "@carbon/react";

interface ChatViewProps {
	currentChat: Chat;
	username: string;
	setChats: (chats: Chat[]) => void;
	lawCollections: string[] | null;
	userChatInput: string;
	setUserChatInput: (input: string) => void;
	contextRedondancy: boolean;
	setContextRedondancy: (input: boolean) => void;
	selectedGPTModel: string;
	setCurrentChat: (chat: Chat) => void;
	setSelectedGPTModel: (model: string) => void;
}

const ChatView: React.FC<ChatViewProps> = ({ selectedGPTModel, setSelectedGPTModel, contextRedondancy, setContextRedondancy, userChatInput, setUserChatInput, currentChat, setCurrentChat, username, setChats, lawCollections }) => {
	const [searchTerm, setSearchTerm] = useState<string>("");
	const [errorMessage, setErrorMessage] = useState<string>("");
	const [searchResults, setSearchResults] = useState<string[]>([]);
	const [loading, setLoading] = useState<boolean>(false);
	const [selectAll, setSelectAll] = useState<boolean>(false);
	const [autoScroll, setAutoScroll] = useState<boolean>(false);
	const [selectedLaws, setSelectedLaws] = useState<string[]>([]);
	const [selectedMessagePath, setSelectedMessagePath] = useState<string[]>([]);
	const [displayedChat, setDisplayedChat] = useState<Chat>(currentChat);
	const [messageEdition, setMessageEdition] = useState<{ [key: string]: string | undefined | null }>({});
	const [showQuotedDocuments, setShowQuotedDocuments] = useState<{ [key: string]: boolean }>({});

	const expandableSearch = <ExpandableSearch placeholder="Filter" labelText="" value={searchTerm} onChange={(e) => handleChange(e)} closeButtonLabelText="Clear search input" size="lg" />;

	useEffect(() => {
		if (selectedLaws.length == lawCollections!.length) {
			setSelectAll(true);
		}
	}, [selectedLaws]);

	useEffect(() => {
		const results = lawCollections!.filter((law) => law.toLowerCase().includes(searchTerm.toLowerCase().replace(/ /g, "_")));
		setSearchResults(results);
	}, [searchTerm, lawCollections]);

	useEffect(() => {
		if (autoScroll) {
			const chatbox = document.getElementsByClassName("chatbox")[0];
			chatbox.scrollTop = chatbox.scrollHeight;
		}
		if (currentChat.id == "" && displayedChat.messages[""] != undefined && displayedChat.messages[""].content.length == 0) {
			setSelectedLaws(lawCollections ? lawCollections : []);
			setSelectAll(true);
		}
		setShowQuotedDocuments({});
		setContextRedondancy(currentChat.context_redondancy);
		setSelectedGPTModel(currentChat.gpt_model);
    setSelectedMessagePath(currentChat.message_path)
	}, [currentChat]);

  useEffect(() => {
    let path: string[] = Object.assign([], selectedMessagePath);
    if (path.length == 0)
      path = [Object.keys(currentChat.messages)[0] as string];
    if (messageNavigation(currentChat.messages, path) == null) return;
    while (Object.keys(messageNavigation(currentChat.messages, path)!.children).length != 0) {
      path = [...path, Object.keys(messageNavigation(currentChat.messages, path)!.children)[0]];
    }
    if (path.length != selectedMessagePath.length)
      setSelectedMessagePath(path);
  }, [selectedMessagePath])

	let lastMessageDisplay = "";

	const onSubmit = async () => {
		setSearchTerm("");
		setLoading(true);
		selectedLaws.map((law, i) => {
			selectedLaws[i] = law.replace(/ /g, "_");
		});
		chatRequest(currentChat, selectedMessagePath, userChatInput, selectedLaws, selectedGPTModel, contextRedondancy)
			.then((response) => {
				setUserChatInput("");
				if (response!= null) {
          setChats(response.chats);
          setSelectedMessagePath(response.messagePath);
        }
				function lastMessageAppearingAnimation(index: number, message: string, interval = 50) {
					if (index < message.length) {
						lastMessageDisplay += message[index];
						setTimeout(function () {
							lastMessageAppearingAnimation(index + 1, message);
						}, interval);
					} else {
						return;
					}
				}
				setErrorMessage("");
				setLoading(false);
			})
			.catch((error) => {
				setErrorMessage(error.message);
				setLoading(false);
			});
    const thisChat = Object.assign({}, currentChat);
    if (Object.keys(thisChat.messages).length == 0) {
      thisChat.messages = { [""]: { id: "", role: "user", content: userChatInput, children: {} } };
    } else {
      const lastMessage: Message|null = messageNavigation(thisChat.messages, selectedMessagePath);
      lastMessage!.children = { ...lastMessage!.children, [""]: { id: "", role: "user", content: userChatInput, children: {} } };
    }
    setCurrentChat(thisChat);
    setSelectedMessagePath([...selectedMessagePath, ""]);
		setDisplayedChat(currentChat);
	};

	function onEditionSubmit(id: string) {
    setMessageEdition({ ...messageEdition, [id]: undefined });
    setLoading(true);
		chatMessageEditRequest(currentChat, selectedMessagePath, messageEdition[id]!, id, selectedGPTModel, contextRedondancy)
			.then((response) => {
				setUserChatInput("");
				if (response != null) {
					setChats(response.chats);
					setSelectedMessagePath(response.messagePath);
				}
				setErrorMessage("");
				setLoading(false);
			})
			.catch((error) => {
				setErrorMessage(error.message);
				setLoading(false);
			});
		setDisplayedChat(currentChat);
	}

	function handleRegenerate(id: string) {
    setLoading(true);
		chatRegenerateRequest(currentChat, selectedMessagePath, id, selectedGPTModel, contextRedondancy)
			.then((response) => {
				setUserChatInput("");
				if (response != null) {
					setChats(response.chats);
					setSelectedMessagePath(response.messagePath);
				}
				setErrorMessage("");
				setLoading(false);
			})
			.catch((error) => {
				setErrorMessage(error.message);
				setLoading(false);
			});
		setDisplayedChat(currentChat);
	}

	function handleChange(event: ChangeEvent) {
		setSearchTerm(event.target.value);
	}

	function handleCollectionSelect(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
		const clickedLaw = e.currentTarget.textContent;
		if (selectedLaws.includes(clickedLaw!)) {
			setSelectedLaws(selectedLaws.filter((law) => law != clickedLaw));
		} else {
			setSelectedLaws([...selectedLaws, clickedLaw!]);
		}
	}

	function handleMessageKeyPress(e: React.KeyboardEvent<HTMLTextAreaElement>) {
		e.key == "Enter" && !e.shiftKey && !loading && onSubmit();
	}
	function handleMessageInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
		setUserChatInput(e.target.value);
	}

	function handleChatScroll(e: (EventTarget & HTMLDivElement) | Element) {
		const element = e;
		setAutoScroll(element.scrollHeight - element.scrollTop === element.clientHeight);
	}

	function handleSelectAll(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
		if (selectAll) {
			setSelectedLaws([]);
			setSelectAll(false);
		} else {
			setSelectedLaws(lawCollections ? lawCollections : []);
			setSelectAll(true);
		}
	}

	function handleShowQuotedDocuments(messageId: string) {
		if (showQuotedDocuments[messageId] == undefined) {
			setShowQuotedDocuments({ ...showQuotedDocuments, [messageId]: true });
		} else setShowQuotedDocuments({ ...showQuotedDocuments, [messageId]: !showQuotedDocuments[messageId] });
	}

  function handleChoosePreviousMessage(index: number, parent: Message, message: Message) {
    setSelectedMessagePath([...selectedMessagePath.slice(0, index), Object.keys(parent.children)[Object.keys(parent.children).indexOf(message.id) - 1]]);
  }

  function handleChooseNextMessage(index: number, parent: Message, message: Message) {
    setSelectedMessagePath([...selectedMessagePath.slice(0, index), Object.keys(parent.children)[Object.keys(parent.children).indexOf(message.id) + 1]]);
  }

	return (
		<div className="chat-container">
			<div className="">
				<h1 className={"chatbox-title " + (Object.keys(currentChat.messages)[0] == "" ? "" : "hidden")}>Ask Demetrius</h1>
				<ContainedList className={"textlaw-list " + (Object.keys(currentChat.messages)[0] == "" ? "" : "hidden")} size="lg" isInset={true} kind="on-page" role="group" label="Textlaws" action={expandableSearch}>
					<SelectableTile name="lawlist" selected={selectAll} key={"selecct all"} id={"selectall"} value={"Select all"} onClick={(e) => handleSelectAll(e)}>
						{"Select all"}
					</SelectableTile>
					{lawCollections == null
						? [...Array(5)].map((listItem, key) => {
								<TextInputSkeleton key={key} hideLabel />;
						  })
						: searchResults.map((listItem, key) => {
								const lawCollectionName = listItem.replace(/_/g, " ");
								return (
									<SelectableTile name="lawlist" selected={selectedLaws.includes(listItem)} key={key} id={lawCollectionName} value={lawCollectionName} onClick={(e) => handleCollectionSelect(e)}>
										{lawCollectionName}
									</SelectableTile>
								);
						  })}
				</ContainedList>
			</div>
			<div className="chat-pricing">${Math.round(currentChat.pricing * 100) / 100}</div>
			<div onScroll={(e) => handleChatScroll(e.currentTarget)} className={"chatbox " + (Object.keys(currentChat.messages)[0] == "" ? "hidden" : "")}>
				{[...Array(selectedMessagePath.length)].map((cringe, i) => {
					const messageId = selectedMessagePath[i];
					const path = selectedMessagePath.slice(0, i + 1);
					const partentPath = selectedMessagePath.slice(0, i);
					const parent = messageNavigation(currentChat.messages, partentPath);
					const message = messageNavigation(currentChat.messages, path);
					if (message == null) return <></>;
					if (message.role != "system") {
						return (
							<div key={i} className={"message " + message.role + "-message"}>
								<div className="message-header">
									<Logo />
									<h4>{message.role === "assistant" ? "Demetrius" : username}</h4>
								</div>
								<p>
									{messageEdition[message.id] != undefined ? (
										<div className="message-edition-container">
											<TextArea disabled={loading} className="message-input" id="chat-input" labelText="Message edition" enableCounter={true} type="text" value={messageEdition[message.id]!} onChange={(e) => setMessageEdition({ ...messageEdition, [message.id]: e.target.value })} maxCount={5000} placeholder="Type your message, press enter to send and shift enter for new line." />
											<div className="side-sending-buttons">
												<Checkbox labelText="Remove context redondancy" id="redondancy" checked={!contextRedondancy} onChange={() => setContextRedondancy(!contextRedondancy)} />
												<Select hideLabel id="gpt-algo" labelText="GPT model" value={selectedGPTModel} defaultValue={currentChat.gpt_model}>
													{["gpt-4-1106-preview", "gpt-3.5-turbo"].map((model, i) => (
														<SelectItem id={model} text={model} value={model} key={i} onClick={() => setSelectedGPTModel(model)}>
															{model}
														</SelectItem>
													))}
												</Select>
												<div>
													<Button size="md" className="send-button" renderIcon={Send} onClick={(e) => onEditionSubmit(message.id)} disabled={loading}>
														{loading ? <InlineLoading status="active" iconDescription="Loading" description="Sending message..." /> : "Edit message"}
													</Button>
													<IconButton onClick={(e: any) => setMessageEdition({ ...messageEdition, [message.id]: undefined })} className="message-close-edition-button" kind="ghost" renderIcon={Close} label="Close edition" />
												</div>
											</div>
										</div>
									) : (
										<ReactMarkdown>{message.content + "  "}</ReactMarkdown>
									)}
								</p>
								<div className="message-actions-container">
									{parent && Object.keys(parent.children).length > 1 ? (
										<div className="message-navigation-container">
											<IconButton disabled={!Object.keys(parent.children)[Object.keys(parent.children).indexOf(message.id) - 1]} size="sm" onClick={(e: any) => handleChoosePreviousMessage(i, parent, message)} className="" kind="ghost" renderIcon={ChevronLeft} label="Edit message" />
											<div className="message-navigation">
												{Object.keys(parent.children).indexOf(message.id) + 1}/{Object.keys(parent.children).length}
											</div>
											<IconButton disabled={!Object.keys(parent.children)[Object.keys(parent.children).indexOf(message.id) + 1]} size="sm" onClick={(e: any) => handleChooseNextMessage(i, parent, message)} className="" kind="ghost" renderIcon={ChevronRight} label="Edit message" />
										</div>
									) : Object.keys(currentChat.messages).length > 1 ? (
										<div className="message-navigation-container">
											<IconButton disabled={!Object.keys(currentChat.messages)[Object.keys(currentChat.messages).indexOf(message.id) - 1]} size="sm" onClick={(e: any) => setSelectedMessagePath([Object.keys(currentChat.messages)[Object.keys(currentChat.messages).indexOf(message.id) - 1]])} className="" kind="ghost" renderIcon={ChevronLeft} label="Edit message" />
											<div className="message-navigation">
												{Object.keys(currentChat.messages).indexOf(message.id) + 1}/{Object.keys(currentChat.messages).length}
											</div>
											<IconButton disabled={!Object.keys(currentChat.messages)[Object.keys(currentChat.messages).indexOf(message.id) + 1]} size="sm" onClick={(e: any) => setSelectedMessagePath([Object.keys(currentChat.messages)[Object.keys(currentChat.messages).indexOf(message.id) + 1]])} className="" kind="ghost" renderIcon={ChevronRight} label="Edit message" />
										</div>
									) : (
										<></>
									)}
									{message.role === "assistant" ? (
										<>
											<Link onClick={(e) => handleShowQuotedDocuments(messageId)} className="quoted-docs-link">
												{" "}
												See sources
											</Link>
											<IconButton size="sm" onClick={(e: any) => handleRegenerate(message.id)} className="message-renew-button" kind="ghost" renderIcon={Renew} label="Regenerate" />
										</>
									) : (
										<></>
									)}
									{message.role === "user" && !messageEdition[message.id] ? <IconButton size="sm" onClick={(e: any) => setMessageEdition({ ...messageEdition, [message.id]: message.content })} className="message-edit-button" kind="ghost" renderIcon={Edit} label="Edit message" /> : <></>}
								</div>
								{showQuotedDocuments[message.id] ? (
									<div className="quoted-documents-container">
										<div className="vertical-line"></div>
										{message.quotes && message.quotes.length > 0 && (message.quotes[0].distance as unknown as number) != 100 ? (
											message.quotes!.map((quote, i) => {
												return (
													<div key={i} className="quoted-document">
														<h3 className="quote-law-name">
															{quote.metadata.document_name}
															<span>#Relevance {Math.round((quote.distance as unknown as number) * 1000) / 1000}</span>
														</h3>
														<h4 className="quote-law-part">{quote.metadata.part_title}</h4>
														<p className="quote-text">"{quote.text}"</p>
													</div>
												);
											})
										) : (
											<div key={"xd"} className="quoted-document">
												<p className="empty-quote">This answer was generated without anything provided from Demetrius's long term memory. Be cautious as the sources used for this answer are unknown.</p>
											</div>
										)}
									</div>
								) : (
									<></>
								)}
							</div>
						);
					}
				})}
				{loading ? (
					<div key={"loading"} className={"message " + "assistant-message"}>
						<div className="message-header">
							<Logo />
							<h4>{"Demetrius"}</h4>
						</div>
						<InlineLoading status="active" iconDescription="Loading" description="Waiting for Demetrius..." />
					</div>
				) : (
					<></>
				)}
			</div>
			<h4 className="error-message">{errorMessage}</h4>
			<div className="message-typing-box">
				<TextArea className="message-input" id="chat-input" labelText="Message" enableCounter={true} type="text" value={userChatInput} onChange={(e) => handleMessageInput(e)} maxCount={5000} placeholder="Type your message, press enter to send and shift enter for new line." onSubmit={onSubmit} disabled={loading} onKeyUp={(e) => handleMessageKeyPress(e)} />
				<div className="side-sending-buttons">
					<Checkbox labelText="Remove context redondancy" id="redondancy" checked={!contextRedondancy} onChange={() => setContextRedondancy(!contextRedondancy)} />
					<Checkbox labelText="Auto scroll" id="auto-scroll" checked={autoScroll} onChange={() => setAutoScroll(!autoScroll)} />
					<Select value={selectedGPTModel} hideLabel id="gpt-algo" labelText="GPT model" defaultValue={currentChat.gpt_model}>
						{["gpt-4-1106-preview", "gpt-3.5-turbo"].map((model, i) => (
							<SelectItem id={model} text={model} value={model} key={i} onClick={() => setSelectedGPTModel(model)}>
								{model}
							</SelectItem>
						))}
					</Select>
					<Button size="md" className="send-button" renderIcon={Send} onClick={onSubmit} disabled={loading}>
						{loading ? <InlineLoading status="active" iconDescription="Loading" description="Sending message..." /> : "Send"}
					</Button>
				</div>
			</div>
		</div>
	);
};

const Logo: React.FC = () => {
  return (
		<svg id="" className="message-logo" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 710.71 652.65">
			<path d="M427.91,326.54a127.79,127.79,0,0,1-97.67,124.18,245.27,245.27,0,0,0,0-248.36A127.79,127.79,0,0,1,427.91,326.54Z" />
			<path d="M515,326.22c.21,90.08-57.92,171.52-143.28,200.33-44.69,15.08-89.53,10.08-89.53,10.08-32.65-3.82-55.37-14.86-60.44-17.4a173.85,173.85,0,0,1-55.76-44.29c28.62,9.84,77.2,31.68,107,33.87A184.54,184.54,0,0,0,295.5,510c73.77-.11,141.81-45.88,169.73-114.08,17.45-42.38,18.32-91.42,1.94-134.26C442.44,194.88,377.91,147.12,306.77,143A185.6,185.6,0,0,0,229,154.22l-63.68,23.62a184.06,184.06,0,0,1,103.91-60.18s5.8-1,12.4-1.74c16.34-1.8,72.89-1.93,120.06,22.72C471.14,174.92,515.14,247.9,515,326.22Z" />
		</svg>
	);
}

export default ChatView;
