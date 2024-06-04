import React, { useEffect, useState, useRef, ChangeEvent } from 'react';
import $ from 'jquery'
import { Add, TrashCan, SidePanelCloseFilled } from '@carbon/icons-react';
import { Modal, DataTable, Button, Table, TableHead, TableRow, TableHeader, TableBody, TableCell, TableContainer, TableToolbar, TableToolbarContent, TableToolbarSearch, TableToolbarMenu, TableToolbarAction, ExpandableSearch } from "@carbon/react";
// @ts-ignore
import { Layer } from "@carbon/react";
import { fetchAccountsRequest, createAccountRequest, updateAccountRequest, deleteAccountRequest } from "../../requests/request";
import AccountsSideFrame from './AccountsSideFrame';

import './accountsframe.scss'

import type { Account } from '../../requests/request';
import type { DataTableRow, DataTableCell, DataTableHeader } from "@carbon/react";

interface AccountsFrameProps {
	hiddenFrame: boolean;
}

const AccountsFrame: React.FC<AccountsFrameProps> = ({ hiddenFrame  }) => {
	const [accounts, setAccounts] = useState<Account[] | null>(null);
	const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
	const [isSideFrameShown, setIsSideFrameShown] = useState<boolean>(false);
	const [isInCreateMode, setIsInCreateMode] = useState<boolean>(false);
	const [isSending, setIsSending] = useState<boolean>(false);
	const [confirmationText, setConfirmationText] = useState<string>("");
	const [sideFrameError, setSideFrameError] = useState<string | undefined>(undefined);
	const [sideFrameSuccess, setSideFrameSuccess] = useState<string | undefined>(undefined);
	const [searchResults, setSearchResults] = useState<Account[]>([]);
	const [searchTerm, setSearchTerm] = useState<string>("");

	function createAccount(account: Account, role: string) {
		setIsSending(true);
		createAccountRequest(account, role)
			.then((message) => {
				fetchAccountsRequest()
					.then((accounts) => {
						setAccounts(accounts!);
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

	function deleteRequest(id: string | null, confirm: boolean = true) {
		for (let account of accounts!) {
			if (id != null && account.id == id) {
				setSelectedAccount(account);
				break;
			}
		}
		if (confirm) setConfirmationText(`Are you want to delete this account?`);
		else {
			setIsSending(true);
			deleteAccountRequest(selectedAccount!)
				.then((message) => {
					fetchAccountsRequest()
						.then((accounts) => {
							setAccounts(accounts!);
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
	}

	function updateRequest(oldAccount: Account, newAccount: Account, role: string) {
		setIsSending(true);
		updateAccountRequest(oldAccount, newAccount, role)
			.then((message) => {
				fetchAccountsRequest()
					.then((accounts) => {
						setAccounts(accounts!);
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

	useEffect(() => {
		(async function fetchData() {
			setAccounts(await fetchAccountsRequest());
		})();
	}, []);

	useEffect(() => {
		if (accounts == null) return;
		const results = accounts.filter((account) => account.username.toLowerCase().includes(searchTerm.toLowerCase()));
		setSearchResults(results);
	}, [searchTerm, accounts]);

	function handleChange(event: { target: HTMLInputElement; type: "change" }) {
		setSearchTerm(event.target.value);
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
			setConfirmationText("");
		}
	}
	function showCreationFrame() {
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
	function showEditFrame(id: string) {
		for (let account of accounts!) {
			if (account.id == id) {
				setSelectedAccount(account);
				break;
			}
		}
		setSideFrameSuccess(undefined);
		setSideFrameError(undefined);
		setIsInCreateMode(false);
		setIsSideFrameShown(true);
	}

	const rows: string[][] = [];
	const headers: string[] = ["id", "username", "privileges", "password", "edit", "delete"];
	if (accounts != null) {
		for (let account of searchResults) {
			const row: string[] = [];
			for (let key of ["id", "username", "privileges"]) {
				const cell = account[key as keyof Account];
				row.push(cell!);
			}
			row.push("************");
			rows.push(row);
		}
	}

	if (hiddenFrame) return <></>;

	return (
		<div className="accounts-frame">
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
								onClick={() => {
									setConfirmationText("");
									deleteRequest(null, false);
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
			<div className={`relative ${isSideFrameShown ? "blur" : ""}`} onClick={(e) => hideEditFrameIfOutside(e)}>
				<div className={`edit-frame screen ${isSideFrameShown ? "unmoved" : "toright"}`}>
					<AccountsSideFrame
						isSending={isSending}
						errorMessage={sideFrameError}
						succesMessage={sideFrameSuccess}
						isInCreateMode={isInCreateMode}
						createAccount={createAccount}
						updateAccount={updateRequest}
						deleteAccount={deleteRequest}
						hideEditFrame={hideEditFrame}
						columnNames={["Username", "Password"]}
						account={isInCreateMode ? null : selectedAccount ? selectedAccount : null}
					/>
				</div>
			</div>
			{accounts != null ? (
				<div className="table-container">
					<div className="table-decorator">
						<h3 className="table-title">User accounts</h3>
						<p className="table-description">In this page, only accessible by admin users, you can have a control over the users of the app and their permissions.</p>
						<p className="table-description">Readers : able to chat and consult judgments;</p>
						<p className="table-description">Editors : able to chat, add and edit laws, consult, edit and add judgments;</p>
						<p className="table-description">Admins: they are able to do everything including managing accounts;</p>
						<h3>Number of Accounts: {accounts.length}</h3>
					</div>
					<TableToolbar className="toolbar">
						<TableToolbarContent>
							{/* pass in `onInputChange` change here to make filtering work */}
							<ExpandableSearch placeholder="Filter" labelText="" value={searchTerm} onChange={(e) => handleChange(e)} closeButtonLabelText="Clear search input" size="lg" />
							<Button onClick={showCreationFrame}>Add new account</Button>
						</TableToolbarContent>
					</TableToolbar>
					<div className="scroll-container">
						<Table size="xl">
							<TableHead className="table-head">
								<TableRow>
									{headers.map((header, i) => (
										<TableHeader key={i} isSortable>
											{header}
										</TableHeader>
									))}
								</TableRow>
							</TableHead>
							<TableBody className="">
								{rows.map((row, i) => {
									return (
										<TableRow key={i}>
											{row.map((cell, i) => (
												<TableCell key={i}>{cell}</TableCell>
											))}
											<TableCell>
												<Button kind="ghost" renderIcon={SidePanelCloseFilled} onClick={() => showEditFrame(row[0])}>
													Edit
												</Button>
											</TableCell>
											<TableCell>
												<Button kind="danger--ghost" renderIcon={TrashCan} onClick={() => deleteRequest(row[0])}>
													Delete
												</Button>
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</div>
				</div>
			) : (
				<></>
			)}
		</div>
	);
};

export default AccountsFrame;