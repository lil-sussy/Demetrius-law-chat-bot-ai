import React, { useEffect, useState, useRef, ChangeEvent, MouseEventHandler } from "react";
import $ from "jquery";
import { Add, Edit, TrashCan, SidePanelCloseFilled, DataBase, CheckmarkOutline } from "@carbon/icons-react";
import { Modal, DataTable, Button, IconButton, TableHead, TableRow, TableHeader, TableBody, TableCell, TableContainer, TableToolbar, TableToolbarContent, Link, TableToolbarMenu, TableToolbarAction, ExpandableSearch, Search } from "@carbon/react";
// @ts-ignore
import { MouseEvent } from "react";
import { FileUploader } from "@carbon/react";

import "./popup.scss";

interface LawCollection {
	name: string;
	edition: boolean;
}

interface PopupProps {
	confirmationText: string;
	confirmationButtonText: string;
	setConfirmationText: (text: string) => void;
	showAddFiles?: boolean;
	validationCallback: (e: MouseEvent<HTMLButtonElement, MouseEvent>, fileList?: { bytes: Promise<ArrayBuffer>; name: string }[]) => void;
}

const Popup: React.FC<PopupProps> = ({ confirmationText, confirmationButtonText, setConfirmationText, showAddFiles=false, validationCallback }) => {
  const [selectedFiles, setSelectedFiles] = useState<{ bytes: Promise<ArrayBuffer>; name: string }[]>([]);
  
  if (confirmationText.length == 0)
    return <></>;
  
  function closePopupIfOutside(e: any) {
		// @ts-ignore
		if (e.target!.className == "popup-background") {
			setConfirmationText("");
		}
	}

  function handleSelectFile(e: any) {
    const files = [];
    for (let file of e.target.files!) files.push({ bytes: file.arrayBuffer(), name: file.name });
    setSelectedFiles([...files]);
  }

  return (
		<div className="popup-background" onClick={closePopupIfOutside}>
			<div className="confirmation-popup">
				<h1 className="popup-title">{confirmationText}</h1>
				<div className={"popup-buttons-container " + showAddFiles ? "show-add-files" : ""}>
					{showAddFiles ? (
						<div className="file-input-container">
							<FileUploader labelTitle="" labelDescription="Max file size is 1Gb. Only .pdf files are supported." buttonLabel="Add pdf(s)" buttonKind="primary" size="md" filenameStatus="edit" accept={[".pdf"]} onChange={(e) => handleSelectFile(e)} multiple={true} disabled={false} iconDescription="Delete file" name="" />
						</div>
					) : (
						<></>
					)}
					<div className={"confirmation-buttons-container "}>
						<Button
							kind="tertiary"
							onClick={(e: any) => {
								setConfirmationText("");
								setSelectedFiles([]);
							}}
						>
							Cancel
						</Button>
						<Button
							kind={showAddFiles ? "tertiary" : "danger--tertiary"}
							renderIcon={showAddFiles ? CheckmarkOutline : TrashCan}
							onClick={(e: any) => {
								setConfirmationText("");
								selectedFiles ? validationCallback(e, selectedFiles) : validationCallback(e);
							}}
						>
							{confirmationButtonText}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}

export default Popup;