import { Button, Form, TextInput, TextInputSkeleton, FileUploader, TextArea } from "@carbon/react";
// @ts-ignore
import { InlineLoading } from "@carbon/react";
import { CheckmarkOutline, TrashCan, SidePanelCloseFilled } from "@carbon/icons-react";

import './sideframe.scss'
import { useEffect, useState } from 'react';

import { emptyJudgment, type Judgment } from '../../requests/request';

interface EditFrameProps {
	isInCreateMode: boolean;
	isSending: boolean;
	judgment: Judgment | null;
	columnNames: string[] | null;
	errorMessage: string | undefined;
	succesMessage: string | undefined;
	hideEditFrame: () => void;
	updateJudgment: (judgment: Judgment, newJudgment: Judgment, fileBuffer: Promise<ArrayBuffer> | null) => void;
	createJudgment: (newJudgment: Judgment, fileBuffer: Promise<ArrayBuffer> | null) => void;
	deleteJudgment: () => void;
}

const EditFrame: React.FC<EditFrameProps> = ({ isInCreateMode, errorMessage, succesMessage, judgment, columnNames, hideEditFrame, updateJudgment, createJudgment, deleteJudgment, isSending }) => {
  const [fileBuffer, setFileBuffer] = useState<Promise<ArrayBuffer>|null>(null);
	const [newJudgment, setNewJudgment] = useState<Judgment>(emptyJudgment);
	// let newJudgment = judgment == null ? emptyJudgment : judgment;
	useEffect(() => {
		setNewJudgment(isInCreateMode ? emptyJudgment : judgment == null ? emptyJudgment : judgment);
	}, [judgment]);
	if (isInCreateMode) {
		columnNames = Object.keys(emptyJudgment);
	}
	if (columnNames == null) return <></>;

	function inputValueChange(e: any) {
		const key = Object.keys(newJudgment)[e.target!.id as unknown as number];
		const test = Object.assign({}, newJudgment);
		test[key as unknown as keyof Judgment] = e.target!.value as Judgment[keyof Judgment];
		setNewJudgment(test);
	}

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    (async function fetchData () {
      setFileBuffer(e.target.files![0].arrayBuffer())
    })();
  }

	return (
		<div className="edit-frame-container">
			<div className="flex-col flex">
				<div className="buttons-container flex">
					<Button kind="tertiary" onClick={hideEditFrame} renderIcon={SidePanelCloseFilled}>
						Close
					</Button>
					{isInCreateMode ? (
						<Button kind="primary" disabled={isSending} onClick={() => createJudgment(newJudgment, fileBuffer)} renderIcon={CheckmarkOutline}>
							Create Judgment
						</Button>
					) : (
						<Button kind="primary" disabled={isSending} onClick={() => updateJudgment(judgment!, newJudgment, fileBuffer)} renderIcon={CheckmarkOutline}>
							Save Changes
						</Button>
					)}
				</div>
				<h4 className="succes-message">{isSending ? <InlineLoading status="active" iconDescription="Loading" description="Saving changes..." /> : succesMessage}</h4>
				{isInCreateMode ? <h1 className="title">Upload new judgment</h1> : <h1 className="title">{columnNames[0] + ": " + newJudgment.reference}</h1>}
			</div>
			<Form className="form">
				{columnNames.length == 0
					? [...Array(3)].map((e, i) => {
							return <TextInputSkeleton className="frame-input-field" key={i} />;
					  })
					: columnNames.map((e, i) => {
              if (e == "summary") {
                if (!isInCreateMode)
                return <TextArea id={`${i}`} labelText={`${e} :`} placeholder={isInCreateMode ? `Specify ${e}` : `previous value : ${Object.values(newJudgment!)[i]}`} invalid={errorMessage ? true : false} invalidText={errorMessage} value={Object.values(newJudgment!)[i]} className="frame-input-field" key={i} onChange={(e) => inputValueChange(e)} />
              } else {
                if (e == "pdf_path" || e == "pricing" || e == 'relevance') return <></>;
                return <TextInput id={`${i}`} size="lg" labelText={`${e} :`} placeholder={isInCreateMode ? `Specify ${e}` : `previous value : ${Object.values(newJudgment!)[i]}`} invalid={errorMessage ? true : false} invalidText={errorMessage} value={Object.values(newJudgment!)[i]} className="frame-input-field" key={i} onChange={(e) => inputValueChange(e)} />;
              }
					  })}
				<FileUploader labelTitle="Upload judgment's file" labelDescription="Max file size is 1GB. Only pdf files are supported." buttonLabel={isInCreateMode ? "Add pdf" : "Change PDF"} buttonKind="primary" size="md" filenameStatus="edit" accept={[".pdf"]} onChange={handleFile} multiple={false} disabled={false} iconDescription="Delete file" name="" />
				{isInCreateMode ? (
					<></>
				) : (
					<Button kind="danger--tertiary" onClick={() => deleteJudgment()} className="delete-button" renderIcon={TrashCan}>
						Delete
					</Button>
				)}
			</Form>
		</div>
	);
};
export default EditFrame;