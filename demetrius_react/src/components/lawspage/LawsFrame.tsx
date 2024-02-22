import React, { useEffect, useState, useRef, ChangeEvent, MouseEventHandler } from "react";
import $ from "jquery";
import { Add, Edit, TrashCan, SidePanelCloseFilled, DataBase, CheckmarkOutline } from "@carbon/icons-react";
import { Modal, DataTable, Button, IconButton, TableHead, TableRow, TableHeader, TableBody, TableCell, TableContainer, TableToolbar, TableToolbarContent, Link, TableToolbarMenu, TableToolbarAction, ExpandableSearch, Search } from "@carbon/react";
// @ts-ignore
import { Layer, ContainedList, ContainedListItem, Menu, MenuItem, ProgressBar, InlineLoading } from "@carbon/react";
import { fetchLawCollectionsRequest, fetchLawFiles as fetchLawFilesRequest, createLawCollectionRequest, editLawCollectionRequest, deleteLawCollectionRequest, deleteLawCollectionFileRequest } from "../../requests/request";
import { MouseEvent } from "react";

import "./lawsFrame.scss";

import type { Account } from "../../requests/request";
import type { DataTableRow, DataTableCell, DataTableHeader } from "@carbon/react";
import { TextInput } from "@carbon/react";
import { FileUploader } from "@carbon/react";
import Popup from "../Popup";

interface LawCollection {
	name: string;
	edition: boolean;
}

interface LawsFrameProps {
	hiddenFrame: boolean;
	backendCollections: string[] | null;
	setBackendCollections: (collections: string[]) => void;
}

const LawsFrame: React.FC<LawsFrameProps> = ({ backendCollections, setBackendCollections, hiddenFrame }) => {
	const [collections, setCollections] = useState<LawCollection[] | null>(null);
	const [collectionsFiles, setCollectionsFiles] = useState<{ [key: string]: string[] } | null>(null);
	const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
	const [isSending, setIsSending] = useState<boolean>(false);
	const [errorMessage, setErrorMessage] = useState<string>('');
	const [confirmationText, setConfirmationText] = useState<string>("");
	const [searchResults, setSearchResults] = useState<LawCollection[]>([]);
	const [searchTerm, setSearchTerm] = useState<string>("");
	const [mouseCoordinates, setMouseCoordinates] = useState<{ x: number; y: number } | null>(null);
	const [showAddFiles, setShowAddFiles] = useState<boolean>(false);
  const [collectionEmbbedProgress, setCollectionEmbbedProgress] = useState<{[key: string]: number|undefined}>({});
  const [validationCallback, setValidationCallback] = useState<{xd : (e: any, fileList?: { bytes: Promise<ArrayBuffer>; name: string }[] | undefined) => void}>({ xd: () => {} });
  const [collectionNameInput, setCollectionNameInput] = useState<{ [key:number]: string|undefined }>([]);
  const [setStateCallback, setSetStateCallback] = useState<{ state: any | null; callbackxd: () => void }>({ state: null, callbackxd: () => {} })
  
  function progressSocketConnection() {
    const socket = new WebSocket("ws://localhost:8001/embedd_progress_consumer");

		socket.onmessage = function (event) {
			const data = JSON.parse(event.data);
      if (data.finished) {
        setCollectionEmbbedProgress({ [data.collection_name]: undefined });
      } else {
        setCollectionEmbbedProgress({ [data.collection_name]: data.progress });
      }
		};
  }
  
	useEffect(() => {
    progressSocketConnection();
		(async function fetchData() {
			setBackendCollections(await fetchLawCollectionsRequest());
		})();
	}, []);

  useEffect(() => {
		setStateCallback.callbackxd();
	}, [setStateCallback]);

	useEffect(() => {
		(async function fetchData() {
			setCollectionsFiles(await fetchLawFilesRequest());
		})();
		if (backendCollections == null) return;
		const collectionList = [];
		for (let collection of backendCollections) {
			collectionList.push({ name: collection, edition: false });
		}
		setCollections(collectionList);
	}, [backendCollections]);

	useEffect(() => {
		if (collections == null) return;
		const results = collections.filter((collection) => collection.name.toLowerCase().includes(searchTerm.toLowerCase()));
		setSearchResults(results);
	}, [collections, searchTerm]);

	function handleChange(event: { target: HTMLInputElement; type: "change" }) {
		setSearchTerm(event.target.value);
	}

	function closePopupIfOutside(event: any) {
		// @ts-ignore
		if (event.target!.className == "popup-background") {
			setConfirmationText("");
		}
	}

	const rows: string[][] = [];
	const headers: string[] = ["id", "username", "privileges", "password", "edit", "delete"];
	if (collections != null) {
		for (let law of searchResults) {
			const row: string[] = [law.name];
			rows.push(row);
		}
	}

	function handleNewCollection() {
		createLawCollectionRequest("New_law_collection").then(() => {
      fetchLawCollectionsRequest().then((collections) => {
        setErrorMessage('')
        setBackendCollections(collections);
      });
    }).catch((err) => {
      setErrorMessage(err.message)
    });
		(async function fetchData() {
			setBackendCollections(await fetchLawCollectionsRequest());
		})();
	}

	function handleNameEdition(i: number) {
		const law_list = collections!.slice();
		law_list[i].edition = true;
    const nameInput = Object.assign({}, collectionNameInput);
		nameInput[i] = law_list[i].name;
		setCollectionNameInput(nameInput);
		setCollections(law_list);
	}

	function handleNameEditionFinished(i: number) {
		const law_list = collections!.slice();
		law_list[i].edition = false;
		setCollections(law_list);
    const nameInput = Object.assign({}, collectionNameInput);
		nameInput[i] = undefined;
		setCollectionNameInput(nameInput);
    const alphanumericRegex = /^[a-zA-Z0-9_]*$/;
		if (!alphanumericRegex.test(collections![i].name)) {
			setErrorMessage("Collection name must only contains alphanumerical characters and underscores");
      setCollections(backendCollections?.map((collection) => ({ name: collection, edition: false })) || null);
			return;
		} else {
			setErrorMessage("");
      editLawCollectionRequest(backendCollections![i], collections![i].name).then(() => {
        fetchLawCollectionsRequest().then((collections) => {
					setBackendCollections(collections);
				});
        setErrorMessage('')
      }).catch((err) => {
        setErrorMessage(err.message)
      })
		}
	}

	function handleCollectionRename(e: ChangeEvent<HTMLInputElement>, i: number) {
		const law_list = Object.assign([], collections!.slice()) as unknown as LawCollection[];
		law_list[i].name = e.target.value;
    const nameInput = Object.assign({}, collectionNameInput)
    nameInput[i] = e.target.value;
    setCollectionNameInput(nameInput);
    const alphanumericRegex = /^[a-zA-Z0-9_]*$/
    if (!alphanumericRegex.test(e.target.value)) {
      setErrorMessage("Collection name must only contains alphanumerical characters and underscores")
      return;
    } else {
      setErrorMessage('')
      setCollections(law_list);
    }
	}

	function handleShowFilesMenu(event: any, i: number) {
		const law_list = collections!.slice();
    setSetStateCallback({ state: mouseCoordinates, callbackxd: () => {
      setMouseCoordinates({ x: event.clientX, y: event.clientY });
    }});
		setMouseCoordinates(null)
		setCollections(law_list);
		event.stopPropagation();
    if (!law_list[i]) return;
    setSelectedCollection(law_list[i].name);
	}

	function handleShowAddFiles(i: number) {
    const collectionName = collections![i].name;
    setSelectedCollection(collectionName);
		setShowAddFiles(true);
    setValidationCallback({ xd: (e: MouseEvent<HTMLButtonElement, MouseEvent>, fileList?: { bytes: Promise<ArrayBuffer>; name: string }[]) => {
      if (fileList) {
        editLawCollectionRequest(collectionName, undefined, fileList).then(() => {
          setErrorMessage('');
          progressSocketConnection();
          setCollectionEmbbedProgress({...collectionEmbbedProgress, [collectionName]: 0 });
          fetchLawCollectionsRequest().then((collections) => {
            setBackendCollections(collections);
          });
          (async function fetchData() {
            setCollectionsFiles(await fetchLawFilesRequest());
          })();
        }).catch((err) => {
          setErrorMessage(err.message)
          });
      }
      setShowAddFiles(false);
      setConfirmationText("");
    }})
		setConfirmationText("Upload new law file(s)");
	}

  function handleDeleteCollection(e: MouseEvent<HTMLButtonElement>, collectionName: string) {
    setSelectedCollection(collectionName);
    setShowAddFiles(false)
    setConfirmationText("Are you sure you want to delete the collection?");
    const xxd = { xd: (e: MouseEvent<HTMLButtonElement, MouseEvent>) => {
			deleteLawCollectionRequest(collectionName)
				.then(() => {
					setErrorMessage("");
          fetchLawCollectionsRequest().then((collections) => {
            setBackendCollections(collections);
          }
          );
				})
				.catch((err) => {
					setErrorMessage(err.message);
				});
			setConfirmationText("");
		}};
    setValidationCallback(xxd)
  }

  function handleDeleteFile(fileName: string) {
    setConfirmationText("Are you sure you want to delete the file ?");
    setShowAddFiles(false);
    setMouseCoordinates(null);
    setValidationCallback({ xd: (e: MouseEvent<HTMLButtonElement, MouseEvent>) => {
      setConfirmationText("");
      deleteLawCollectionFileRequest(selectedCollection!, fileName).then(() => {
        setErrorMessage('');
        (async function fetchData() {
          setCollectionsFiles(await fetchLawFilesRequest());
        })();
      }).catch((err) => {
        setErrorMessage(err.message)
      })
    }})
  }

  if (hiddenFrame) return <></>;

	return (
		<div className="accounts-frame" onClick={() => setMouseCoordinates(null)}>
			<Popup confirmationButtonText={showAddFiles ? "Select files" : "Delete"} confirmationText={confirmationText} setConfirmationText={setConfirmationText} showAddFiles={showAddFiles} validationCallback={validationCallback.xd} />
			<Menu className='files-menu' size="lg" y={mouseCoordinates ? mouseCoordinates.y : 0} x={mouseCoordinates ? mouseCoordinates.x : 0} open={mouseCoordinates} target={document.body}>
				{collectionsFiles && selectedCollection && collectionsFiles[selectedCollection] && collectionsFiles[selectedCollection].length == 0 ? <MenuItem label="<No files>" action={<Button />}></MenuItem> : <></>}
				{collectionsFiles && selectedCollection && collectionsFiles[selectedCollection] && !collectionEmbbedProgress[selectedCollection] ? (
					collectionsFiles[selectedCollection].map((file, i) => {
						return (
							<div key={i} className="menu-item-relative">
								<MenuItem className="file-menu-item" label={file} action={<Button />} key={i}></MenuItem>
								<div className="menu-file-delete-container">
									<IconButton onClick={() => handleDeleteFile(file)} className="menu-file-delete" renderIcon={TrashCan} kind="danger--ghost" />
								</div>
							</div>
						);
					})
				) : (
					<></>
				)}
			</Menu>
			<div id="cringe" className="table-container">
				<div className="law-list-header">
					<div className="law-list-left">
						<h3 className="table-title">Law collections</h3>
						<p className="table-description">Here is given the access of the long term memory of Demetrius. You can add and change laws embbeded in its memory using the list bellow.</p>
						<p className="table-description">Every law collection can be composed of a single file multiple files grouped to form a law collection. Every collection can be selected when talking to demetrius to filter the long term memory used by demetrius.</p>
						{collections ? <h3>Embedded collections: {collections!.length}</h3> : <></>}
					</div>
					<div className="law-list-right">
						<p className="table-description">Before uploading a file, please note that if the document doesn't respect the following format it will likely not be embedded.</p>
						<p className="table-description">If the file is larger that approximately 5000 words, please make sure that part names valid those regular expressions :</p>
						<TestInputRegex />
					</div>
					{errorMessage ? <p className="error-message">{errorMessage}</p> : <></>}
				</div>
				<Layer level={1}>
					<ContainedList label="collections" className="">
						<TableToolbar className="toolbar">
							<TableToolbarContent>
								{/* pass in `onInputChange` change here to make filtering work */}
								<Search placeholder="Filter" labelText="" value={searchTerm} onChange={(e) => handleChange(e)} closeButtonLabelText="Clear search input" size="lg" />
								<Button onClick={handleNewCollection} renderIcon={Add}>
									Create new law collection
								</Button>
							</TableToolbarContent>
						</TableToolbar>
						{collections ? (
							<div className="law-list-scroll-container">
								{searchResults.map((collection, i) => {
									return (
										<ContainedListItem className="" key={i}>
											<div className="collection-item">
												{collection.edition ? <IconButton label="Rename collection" className="collection-rename" kind="ghost" renderIcon={CheckmarkOutline} onClick={() => handleNameEditionFinished(i)} /> : <IconButton className="collection-rename" kind="ghost" renderIcon={Edit} onClick={() => handleNameEdition(i)} />}
												{collection.edition ? (
													<div className="frame-input-field">
														<TextInput id={`${i}`} size="xl" labelText={``} placeholder={`Specify collection name`} invalid={false} invalidText={""} value={collectionNameInput[i]} className="frame-input-field" onChange={(e) => handleCollectionRename(e, i)} />{" "}
													</div>
												) : collectionEmbbedProgress[collection.name] ? (
													<InlineLoading className="frame-input-field" iconDescription="Loading" description="Embedding files..." />
												) : (
													<h4 className="collection-name">{collection.name}</h4>
												)}
												<Button onClick={(e) => handleShowFilesMenu(e, i)} className="collection-files" kind="ghost" renderIcon={DataBase}>
													embedded files
												</Button>
												<IconButton disabled={collectionEmbbedProgress[collection.name]} onClick={() => handleShowAddFiles(i)} label="Embed new file" className="collection-add" kind="ghost" renderIcon={Add} />
												{collectionEmbbedProgress[collection.name] ? <ProgressBar hideLabel status="active" size="big" className="collection-embbed-progress" label="Embedding in progress..." value={collectionEmbbedProgress[collection.name]} /> : <></>}
												<div className="collection-delete-container" style={{ marginLeft: "auto", justifySelf: "end" }}>
													<IconButton onClick={(e: any) => handleDeleteCollection(e, collection.name)} label="Delete collection" className="collection-delete" kind="danger--ghost" renderIcon={TrashCan} />
												</div>
											</div>
										</ContainedListItem>
									);
								})}
							</div>
						) : (
							<></>
						)}
					</ContainedList>
				</Layer>
			</div>
		</div>
	);
};

interface TestInputRegexProps {}

const TestInputRegex: React.FC<TestInputRegexProps> = () => {
  const [validInputs, setValidInputs] = useState<number[]>([1, 2]);
  const [partInput, setPartInput] = useState<string>("PART I - PRELIMINARY AND GENERAL RULES OF INTERPRETATION");
  const [sectionInput, setSectionInput] = useState<string>("1. Application of Act");
  
  function handleRegexTestInputChange(regex: RegExp, i: number, e: ChangeEvent<HTMLInputElement>) {
    if (i == 1) {
      setPartInput(e.target.value);
    } else {
      setSectionInput(e.target.value);
    }
    if (regex.test(e.target.value)) {
      if (!validInputs.includes(i)) {
        setValidInputs([...validInputs, i]);
      }
    } else {
      if (validInputs.includes(i)) {
        setValidInputs(validInputs.filter((input) => input != i));
      }
    }
  }
  
	return (
		<>
			<div className={`law-list-regex-input ${validInputs.includes(1) ? "valid" : "invalid"}`}>
				<TextInput id="1" size="lg" labelText={"Part name, optionnal : /PART ([I]|[V]|[X])* ([-]|[–]) ((\\w)|[']|[\"]|[ ]|[(]|[)])+/"} placeholder="Test a string" onChange={(e) => handleRegexTestInputChange(/PART ([I]|[V]|[X])* ([-]|[–]) ((\w)|[']|["]|[ ]|[(]|[)])+/, 1, e)} value={partInput} />
			</div>
			<div className={`law-list-regex-input ${validInputs.includes(2) ? "valid" : "invalid"}`}>
        <TextInput placeholder="Test a string" onChange={(e) => handleRegexTestInputChange(/\d\d*([A-Z]|)[.][ ]*((\w)|[']|["]|[ ]|[(]|[)])+/, 2, e)} size="lg" id="2" labelText={"Section name, required : /\\d\\d*([A-Z]|)[.][ ]*((\\w)|[']|[\"]|[ ]|[(]|[)])+/"} value={sectionInput} />
      </div>
		</>
	);
};

export default LawsFrame;
