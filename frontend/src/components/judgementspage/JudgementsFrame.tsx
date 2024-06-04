import React, { useEffect, useState, useRef } from 'react';
import JudgementTable from "./JudgementsTable";
import SideFrame from './SideFrame';
import $ from 'jquery'
import { Add, TrashCan, SidePanelCloseFilled } from '@carbon/icons-react';
import { Modal, Button } from "@carbon/react";
// @ts-ignore
import { Layer } from "@carbon/react";
import JugmentPanel from './JudgmentPanel'
import { createJudgmentRequest, updateJudgmentRequest, deleteJudgmentsRequest, fetchJudgmentsRequest } from "../../requests/request";

import './judgementsframe.scss'

import type { Judgment } from '../../requests/request';

interface JudgementTableProps {
	judgments: Judgment[] | null;
	hiddenFrame: boolean;
	userPriviliges: string;
	setJudgments: (judgments: Judgment[] | null) => void;
}

const JudgementFrame: React.FC<JudgementTableProps> = ({ hiddenFrame, userPriviliges, judgments, setJudgments }) => {
	const [selectedJudgments, setSelectedJudgments] = useState<string[]>([]);
	const [editingJudgment, setEditingJudgment] = useState<Judgment | null>(null);
	const [isSideFrameShown, setIsSideFrameShown] = useState<boolean>(false);
	const [isInCreateMode, setIsInCreateMode] = useState<boolean>(false);
	const [isSending, setIsSending] = useState<boolean>(false);
	const [isJudgmentPanelShown, setIsJudgmentPanelShown] = useState<boolean>(false);
	const [confirmationText, setConfirmationText] = useState<string>("");
	let [tableData, setTableData] = useState<Judgment[] | null>(judgments);
	const [columnNames, setColumnNames] = useState<string[] | null>(null);
	const [sideFrameError, setSideFrameError] = useState<string | undefined>(undefined);
	const [sideFrameSuccess, setSideFrameSuccess] = useState<string | undefined>(undefined);
	const [judgmentIsSending, setJudgmentIsSending] = useState<{ [ref: string]: boolean }>({});
	const [userAdvancedSearchInput, setUserAdvancedSearchInput] = useState<string>("");
  const [judgmentSearchTerm, setJudgmentSearchTerm] = useState<string>("");

	function createJudgment(judgment: Judgment, fileBuffer: Promise<ArrayBuffer> | null) {
		if (fileBuffer == null) {
			setSideFrameError("Please upload the pdf document of the judmgent");
			return;
		}
		setIsSending(true);
		setJudgmentIsSending((prev) => ({ ...prev, [judgment.reference]: true }));
		function afterFileUpload(e: any) {
			setJudgmentIsSending((prev) => ({ ...prev, [judgment.reference]: false }));
			fetchJudgmentsRequest(userAdvancedSearchInput)
				.then((judgments) => {
					setJudgments(judgments!);
				})
				.catch((err: any) => {
					console.log(err);
				});
		}
		createJudgmentRequest(judgment, fileBuffer, afterFileUpload)
			.then((message) => {
				fetchJudgmentsRequest(userAdvancedSearchInput)
					.then((judgments) => {
						setJudgments(judgments!);
						setIsSending(false);
					})
					.catch((err: any) => {
						console.log(err);
					});
				setSideFrameError(undefined);
				setSideFrameSuccess(message);
			})
			.catch((err: { message: string }) => {
				setIsSending(false);
				setJudgmentIsSending((prev) => ({ ...prev, [judgment.reference]: false }));
				setSideFrameSuccess(undefined);
				setSideFrameError(err.message);
			});
	}

	function deleteRequest(confirm: boolean = true, judgments?: Judgment[]) {
		if (confirm) askConfirmation(`Are you want to delete ${selectedJudgments.length} rows?`);
		else {
			setIsSending(true);
			deleteJudgmentsRequest(tableData!.filter((judgment) => selectedJudgments.includes(judgment.reference)))
				.then((message) => {
					fetchJudgmentsRequest(userAdvancedSearchInput)
						.then((judgments) => {
							setIsSending(false);
							setJudgments(judgments!);
						})
						.catch((err: any) => {
							console.log(err);
						});
				})
				.catch((err: { message: string }) => {
					setIsSending(false);
				});
		}
	}

	function updateRequest(oldJudgment: Judgment, newJudgment: Judgment, fileBuffer: Promise<ArrayBuffer> | null) {
		setIsSending(true);
    if (fileBuffer != null)
      setJudgmentIsSending((prev) => ({ ...prev, [oldJudgment.reference]: true }));
		function afterFileUpload(e: any) {
			setJudgmentIsSending((prev) => ({ ...prev, [oldJudgment.reference]: false }));
			fetchJudgmentsRequest(userAdvancedSearchInput)
				.then((judgments) => {
					setJudgments(judgments!);
				})
				.catch((err: any) => {
					console.log(err);
				});
		}
		updateJudgmentRequest(oldJudgment, newJudgment, fileBuffer, afterFileUpload)
			.then((message) => {
				setIsSending(false);
				fetchJudgmentsRequest(userAdvancedSearchInput)
					.then((judgments) => {
						setJudgments(judgments!);
						setIsSending(false);
					})
					.catch((err: any) => {
						console.log(err);
					});
				setSideFrameError(undefined);
				setSideFrameSuccess(message);
			})
			.catch((err: { message: string }) => {
				setIsSending(false);
				setSideFrameSuccess(undefined);
				setSideFrameError(err.message);
			});
	}

	function askConfirmation(question: string) {
		setConfirmationText(question);
	}

	function searchRequest() {
		setJudgments(null);
		fetchJudgmentsRequest(userAdvancedSearchInput)
			.then((judgments) => {
				setJudgments(judgments!);
			})
			.catch((err: any) => {
				console.log(err);
			});
	}

	function showRowCreation() {
		setIsInCreateMode(true);
		setIsSideFrameShown(true);
		setSideFrameSuccess(undefined);
		setSideFrameError(undefined);
	}
	function hideCreationFrame() {
		setIsInCreateMode(false);
		setIsSideFrameShown(false);
	}
	function hideEditFrame() {
		setIsSideFrameShown(false);
	}
	function showEditFrame(judgment: Judgment) {
		setEditingJudgment(judgment);
		setSideFrameSuccess(undefined);
		setSideFrameError(undefined);
		setIsInCreateMode(false);
		setIsSideFrameShown(true);
	}
	function hideEditFrameIfOutside(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
		// @ts-ignore
		if (e.target!.className == "relative") {
			setIsSideFrameShown(false);
		}
	}
	function closePopupIfOutside(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
		// @ts-ignore
		if (e.target!.className == "popup-background") {
			askConfirmation("");
		}
	}
	function showJudgmentPanel(judgment: Judgment) {
		setEditingJudgment(judgment);
		setIsJudgmentPanelShown(true);
	}

	useEffect(() => {
		let theme = "g100"; // "white" | "g10" | "g80" | "g90" | "g100"
		document.documentElement.setAttribute("theme", theme);
		const columns = [];
		if (judgments == null) return;
		if (judgments.length == 0) return;
		const keys = Object.keys(judgments[0]);
		for (let key in keys) {
			columns.push(keys[key]);
		}
		setColumnNames(columns);
		if (isSending) {
			setTableData(null);
		} else {
			setTableData(judgments);
		}
	}, [judgments, isSending]);

  if (hiddenFrame) {
    return <></>
  }

	return (
		<>
			{confirmationText.length > 0 ? (
				<div className="popup-background" onClick={closePopupIfOutside}>
					<div className="confirmation-popup">
						<h1 className="popup-title">{confirmationText}</h1>
						<div className="popup-button-container">
							<Button kind="tertiary" onClick={() => askConfirmation("")}>
								Cancel
							</Button>
							<Button
								kind="danger--tertiary"
								renderIcon={TrashCan}
								onClick={() => {
									askConfirmation("");
									deleteRequest(false);
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
			<div className={`judgment-panel-background relative ${isJudgmentPanelShown ? "blur" : ""}`}>
				<div className={`judgment-panel ${isJudgmentPanelShown ? "unmoved" : "tobottom"}`}>
					<JugmentPanel judgmentIsSending={judgmentIsSending} closePanel={() => setIsJudgmentPanelShown(false)} judgmentData={editingJudgment!} />
				</div>
			</div>
			<div className="main-container">
				<div id="table-frame" className="table-frame screen">
					<JudgementTable
            judgmentSearchTerm={judgmentSearchTerm}
            setJudgmentSearchTerm={setJudgmentSearchTerm}
						judgmentIsSending={judgmentIsSending}
						userPriviliges={userPriviliges}
						isSending={isSending}
						showJudgmentPanel={showJudgmentPanel}
            selectedJudgments={selectedJudgments}
						userAdvancedSearchInput={userAdvancedSearchInput}
						setUserAdvancedSearchInput={setUserAdvancedSearchInput}
						advancedSearch={searchRequest}
						showRowCreation={showRowCreation}
						deleteSelectedRows={deleteRequest}
						columnNames={columnNames}
						setSelectedJudgments={setSelectedJudgments}
						tableData={tableData}
						showEditFrame={showEditFrame}
						hideEditFrame={hideEditFrame}
					/>
				</div>
			</div>
			<div className={`relative ${isSideFrameShown ? "blur" : ""}`} onClick={(e) => hideEditFrameIfOutside(e)}>
				<div className={`edit-frame screen ${isSideFrameShown ? "unmoved" : "toright"}`}>
					<SideFrame isSending={isSending} errorMessage={sideFrameError} succesMessage={sideFrameSuccess} isInCreateMode={isInCreateMode} createJudgment={createJudgment} updateJudgment={updateRequest} deleteJudgment={deleteRequest} hideEditFrame={hideEditFrame} columnNames={columnNames} judgment={isInCreateMode ? null : editingJudgment ? editingJudgment : null} />
				</div>
			</div>
		</>
	);
};

export default JudgementFrame;