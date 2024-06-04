export type RowKeys = string[];
export type RowValues = string[];

export interface Chat {
	id: string;
	creation_date: string;
	name: string;
	message_path: string[];
	pricing: number;
	gpt_model: string;
	context_redondancy: boolean;
	messages: { [messageId: string]: Message };
}

export const emptyMessage: Message = {
  id: "",
  role: "",
  content: "",
  children: {},
};

export const emptyChat: Chat = { id: "", name: "", message_path: [], context_redondancy: true, gpt_model: "gpt-4-1106-preview", creation_date: "", messages: { [""]: emptyMessage }, pricing: 0 };

export function messageNodeNavigation(messageTree: Message, path: string[]): Message|null {
  let message = messageTree;
  for (let i = 0; i < path.length; i++) {
    if (!message.children[path[i]])
      return null
    else
      message = message.children[path[i]]
  }
  return message
}

export function messageNavigation(messageList: {[key:string]: Message}, path: string[]): Message|null {
  if (messageList[path[0]] == undefined)
    return null
  return messageNodeNavigation(messageList[path[0]], path.slice(1))
}

export interface Message {
  id: string;
	role: string;
	content: string;
	quotes?: {
    text: string;
		metadata: {
      part_title: string;
			document_name: string;
			begin_page: number;
			end_page: number;
		};
		distance: string;
	}[];
  children: {[messageId:string]: Message};
}

const csrfToken:string = getMeta("csrf-token");

export async function chatListRequest(): Promise<Chat[]|null> {
  const body = {}

  return backend_request("/api/chat/list/", 'GET', body).then((res) => {
    const chats = []
    for (let chat of Object.values(res.chats)) {
      chats.push(chat as Chat)
    }
    return chats
  }).catch((err) => {
    return null
  })
}

export async function chatRequest(chat: Chat, messagePath: string[], userInput: string, selectedLaws: string[], gptModel: string, contextRedondancy: boolean): Promise<{chats: Chat[], messagePath: string[]} | null> {
	const body = {
		chat: chat,
		message_path: messagePath,
		user_query: userInput,
		gpt_model: gptModel,
		context_redondancy: contextRedondancy,
		selected_laws: selectedLaws,
	};
	return backend_request("/api/chat/", "POST", body)
		.then((res) => {
			const chats = [];
			for (let chat of Object.values(res.chats)) {
				chats.push(chat as Chat);
			}
			return { chats: chats, messagePath: res.message_path as string[]};
		})
		.catch((err) => {
			throw err;
		});
}

export async function chatMessageEditRequest(chat: Chat, messagePath: string[], editedMessage: string, id: string, gptModel: string, contextRedondancy: boolean): Promise<{ chats: Chat[]; messagePath: string[] } | null> {
	const body = {
		chat: chat,
		message_path: messagePath,
		message_id: id,
		edited_message: editedMessage,
		gpt_model: gptModel,
		context_redondancy: contextRedondancy,
	};
	return backend_request("/api/chat/edit_message/", "POST", body)
		.then((res) => {
			const chats = [];
			for (let chat of Object.values(res.chats)) {
				chats.push(chat as Chat);
			}
			return { chats: chats, messagePath: res.message_path as string[] };
		})
		.catch((err) => {
			throw err;
		});
}

export async function chatRegenerateRequest(chat: Chat, messagePath: string[], id: string, gptModel: string, contextRedondancy: boolean): Promise<{ chats: Chat[]; messagePath: string[] } | null> {
	const body = {
		chat: chat,
		message_path: messagePath,
		message_id: id,
		gpt_model: gptModel,
		context_redondancy: contextRedondancy,
	};
	return backend_request("/api/chat/regenerate/", "POST", body)
		.then((res) => {
			const chats = [];
			for (let chat of Object.values(res.chats)) {
				chats.push(chat as Chat);
			}
			return { chats: chats, messagePath: res.message_path as string[] };
		})
		.catch((err) => {
			throw err;
		});
}

export async function removeChatRequest(chat: Chat): Promise<Chat[]> {
  const body = {
    chat: chat,
  }
  return backend_request("/api/chat/remove/", 'POST', body).then((res) => {
    const message = res.message as string;
    const chats = res.chats as Chat[];
    return chats;
  }).catch((err) => {
    throw err
  })
}

export interface Judgment {
  reference: string;
  name: string;
  pricing: string;
  jurisdiction: string;
  judges: string;
  pdf_path: string;
  summary: string;
}

export const emptyJudgment: Judgment = {
  reference: '',
  name: '',
  pdf_path: '',
  jurisdiction: '',
  pricing: '',
  judges: '',
  summary: '',
}

export async function fetchJudgmentsRequest(search_query: string): Promise<Judgment[]|null> {
  const body = {
    search_query: search_query,
  }
  return backend_request("/api/jst/get/", 'POST', body).then((res) => {
    const judgments = res.judgments as Judgment[];
    return judgments
  }).catch((err) => {
    return null
  })
}

export async function createJudgmentRequest(judgment: Judgment, fileBuffer: Promise<ArrayBuffer>, callBack?: (e:any) => void): Promise<string> {
  const address = csrfToken === "" ? "http://localhost:8000" : window.location.origin;
	const body = {
		judgment: judgment,
	};
  const array = new Uint8Array(await fileBuffer);
	return backend_request("/api/jst/insert/", "POST", body).then((res) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", address + "/api/jst/insert/file/" + judgment['reference'] + '/', true)
    xhr.onerror = function (e) {
      throw e
    }
    xhr.onloadend = function (e) {
      callBack!(e)
    }
    xhr.send(array)
    const message = res.message as string;
    return message;
  })
  .catch((err) => {
    throw err;
  });
}

export async function deleteJudgmentsRequest(judgments: Judgment[]): Promise<string> {
  const body = {
    judgments: judgments,
  }
  return backend_request("/api/jst/delete/", 'POST', body).then((res) => {
    const message = res.message as string;
    return message
  }).catch((err) => {
    throw err
  })
}

export async function updateJudgmentRequest(oldjudgment: Judgment, newjudgment: Judgment, arrayBuffer: Promise<ArrayBuffer> | null, callback?: (e:any) => void): Promise<string> {
	const body = {
		newjudgment: newjudgment,
		oldjudgment: oldjudgment,
	};

	let array: any;
	if (arrayBuffer != null) {
		array = new Uint8Array(await arrayBuffer);
	}
	return backend_request("/api/jst/update/", "POST", body)
		.then((res) => {
			if (arrayBuffer != null) {
				const xhr = new XMLHttpRequest();
				xhr.open("POST", address + "/api/jst/insert/file/" + newjudgment["reference"] + "/", true);
				xhr.onerror = function (e) {
					throw e;
				};
				xhr.setRequestHeader("X-CSRFToken", csrfToken);
				xhr.setRequestHeader("X-Requested-With", getCookie("access_token") as string);
				xhr.onloadend = function (e) {
					callback!(e);
				};
				xhr.send(array);
			}
			const message = res.message as string;
			return message;
		})
		.catch((err) => {
			throw err;
		});
}

export async function fetchLawCollectionsRequest(): Promise<string[]> {
  const body = {}
  return backend_request("/api/chat/law/list/", 'GET', body).then((res) => {
    const laws = res.collections as string[];
    return laws
  }).catch((err) => {
    return []
  })
}

export const accountPrivileges: string[] = ["admin", "reader_user", "editor_user"];
export interface Account {
	id: string;
  password?: string;
	username: string;
	privileges: "admin" | "reader_user" | "editor_user";
}

export const emptyAccount: Account = {
  id: '',
  username: '',
  password: '',
  privileges: 'reader_user',
}

export async function fetchAccountsRequest(): Promise<Account[]> {
  const body = {}
  return backend_request("/user/list/", 'GET', body).then((res) => {
    const accounts = res.users as Account[];
    return accounts
  }).catch((err) => {
    return []
  })
}

export async function createAccountRequest(account: Account, role: string): Promise<string> {
  account.privileges = role as "admin" | "reader_user" | "editor_user";
  const body = {
    account: account,
  }
  return backend_request("/user/create/", 'POST', body).then((res) => {
    const message = res.message as string;
    return message
  }).catch((err) => {
    throw err
  })
}

export async function updateAccountRequest(oldaccount: Account, newaccount: Account, role: string): Promise<string> {
  newaccount.privileges = role as "admin" | "reader_user" | "editor_user";
  const body = {
    newaccount: newaccount,
    oldaccount: oldaccount,
  };
  return backend_request("/user/update/", 'POST', body).then((res) => {
    const message = res.message as string;
    return message
  }).catch((err) => {
    throw err
  })
}

export async function deleteAccountRequest(account: Account): Promise<string> {
  const body = {
    account: account,
  }
  return backend_request("/user/delete/", 'POST', body).then((res) => {
    const message = res.message as string;
    return message
  }).catch((err) => {
    throw err
  })
}

export async function authenticationRequest(): Promise<{ message: string, account: Account }> {
	return backend_request("/user/auth/", "GET", {})
		.then((response) => {
      return { message: response.message, account: response.user as Account }
		})
		.catch((err) => {
			throw err;
		});
}

export async function loginRequest(username: string, password: string): Promise<{ message: string, account: Account }> {
  const body = {
    username,
    password,
  }
  return backend_request('/user/login/', 'POST', body).then((response) => {
    setCookie("access_token", response.access_token, response.expires_in);
    return { message: response.message as string, account: response.user as Account }
  }).catch((err) => {
    throw err
  });
}

export async function logout() {
	setCookie("access_token", "", 0);
  document.cookie = ''
}

export interface CollectionsFiles {
  [collection: string]: string[];
}

export async function fetchLawFiles(): Promise<CollectionsFiles|null> {
  const body = {}
  return backend_request("/api/chat/law/list/files/", 'GET', body).then((res) => {
    const laws = res.collections as CollectionsFiles;;
    return laws
  }).catch((err) => {
    return null
  })
}

export async function createLawCollectionRequest(collectionName:string) {
  const body = {
    collection_name: collectionName,
  }
  return backend_request("/api/chat/law/create/", 'POST', body).then((res) => {
    const message = res.message as string;
    return message
  }).catch((err) => {
    throw err
  })
}

export async function editLawCollectionRequest(collectionOldName?: string, collectionNewName?: string, files?: {bytes: Promise<ArrayBuffer>, name:string}[]): Promise<string> {
  if (files) {
    
    return new Promise((resolve, reject) =>  {
      for (let file of files) {
        (async () => {
					return new Uint8Array(await file.bytes);
				})().then((bytes) => {
					const xhr = new XMLHttpRequest();
					xhr.open("POST", `${address}/api/chat/law/create/file/${collectionOldName}/${file.name}/`, true);
					xhr.onerror = function (e) {
						throw e;
					};
					xhr.onloadend = function (e) {};
          xhr.setRequestHeader("X-CSRFToken", csrfToken);
          xhr.setRequestHeader("X-Requested-With", getCookie('access_token') as string);
					xhr.send(bytes);
          return resolve("success");
				});
      }
    })
	}
	const body = {
		collection_old_name: collectionOldName,
		collection_new_name: collectionNewName,
	};
	return backend_request("/api/chat/law/edit/", "POST", body)
		.then((res) => {
			const message = res.message as string;
			return message;
		})
		.catch((err) => {
			throw err;
		});
}

export async function deleteLawCollectionRequest(collectionName: string): Promise<string> {
  const body = {
    collection_name: collectionName,
  }
  return backend_request("/api/chat/law/delete/", 'POST', body).then((res) => {
    const message = res.message as string;
    return message
  }).catch((err) => {
    throw err
  })
}

export async function deleteLawCollectionFileRequest(collectionName: string, fileName: string): Promise<string> {
  const body = {
    collection_name: collectionName,
    file_name: fileName,
  }
  return backend_request("/api/chat/law/files/delete/", "POST", body)
		.then((res) => {
			const message = res.message as string;
			return message;
		})
		.catch((err) => {
			throw err;
		});
}

export const address = csrfToken === "" ? "http://localhost:8000" : window.location.origin;
async function backend_request(url: string, method: string, body: any) {
  const address = csrfToken === '' ? 'http://localhost:8000' : window.location.origin;
  const request =
		method == "GET"
			? {
					method: method,
					headers: {
            "Content-Type": "application/; charset=UTF-8",
						"X-CSRFToken": csrfToken,
						"X-Requested-With": getCookie('access_token') as string,
					},
			  }
        : {
          method: method,
					headers: {
            "Content-Type": "application/; charset=UTF-8",
						"X-CSRFToken": csrfToken,
						"X-Requested-With": getCookie('access_token') as string,
					},
					body: JSON.stringify(body),
			  };
  const res = await fetch(address + url, request);
	const resJson = await res.json();
	if (res.status !== 200) { 
    if (res.status === 401 && url != "/user/auth/" && !url.includes('get') && !url.includes('list')) {
      window.location.reload();
		} else
      throw new Error(resJson.message as string)
	} else {
    return resJson
	}
}

export function getMeta(metaName: string):string {
	const metas = document.getElementsByTagName("meta");
	for (let i = 0; i < metas.length; i++) {
		if (metas[i].getAttribute("name") === metaName) {
			const test = metas[i].getAttribute("content");
      if (!test)
        return ""
      else return test
		}
	}
	return "";
}

export function getCookie(name: string):string {
	const value = `; ${document.cookie}`;
	const parts = value.split(`; ${name}=`);
  if (parts == undefined) return ""
  else
    if (parts.length === 2) {
      const test = parts.pop()?.split(";").shift()
      if (!test)
        return ""
      else return test
    }
    else return ""
}

export function setCookie(name: string, value: string, hours: number) {
	let expires = "";
	if (hours) {
		const date = new Date();
		date.setTime(date.getTime() + hours * 60 * 60 * 1000);
		expires = `; expires=${date.toUTCString()}`;
	}
	document.cookie = `${name}=${value || ""}${expires}; path=/; SameSite=Lax;`;
}
