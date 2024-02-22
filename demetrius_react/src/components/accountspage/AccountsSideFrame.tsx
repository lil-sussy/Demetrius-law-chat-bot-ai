import { Button, Form, TextInput, TextInputSkeleton, FileUploader } from "@carbon/react";
// @ts-ignore
import { InlineLoading, Menu, MenuItem, Select, SelectItem } from "@carbon/react";
import { CheckmarkOutline, TrashCan, SidePanelCloseFilled } from "@carbon/icons-react";

import './accountsSideframe.scss'
import { useEffect, useState } from 'react';

import { emptyAccount, type Account, accountPrivileges } from '../../requests/request';

interface AccountsSideFrameProps {
	isInCreateMode: boolean;
	isSending: boolean;
	account: Account | null;
	columnNames: string[] | null;
	errorMessage: string | undefined;
	succesMessage: string | undefined;
	hideEditFrame: () => void;
	updateAccount: (judgment: Account, newAccount: Account, role: string) => void;
	createAccount: (newAccount: Account, role: string) => void;
	deleteAccount: (id: string) => void;
}

const AccountsSideFrame: React.FC<AccountsSideFrameProps> = ({ isInCreateMode, errorMessage, succesMessage, account, columnNames, hideEditFrame, updateAccount, createAccount, deleteAccount, isSending }) => {
	const [newAccount, setNewAccount] = useState<Account>(emptyAccount);
	const [selectedRole, setSelectedRole] = useState<string>("reader_user");
	// let newAccount = judgment == null ? emptyJudgment : judgment;
  
	useEffect(() => {
    if (account !!= null) account.password = "";
		setNewAccount(isInCreateMode ? emptyAccount : account == null ? emptyAccount: account);
	}, [account]);
  
	if (isInCreateMode) {
		columnNames = ['username', 'password'];
	}
	if (columnNames == null) return <></>;

	function inputValueChange(e: React.ChangeEvent<HTMLInputElement>, key: string) {
		setNewAccount({...newAccount, [key.toLowerCase()]: e.target!.value as Account[keyof Account]});
	}

	return (
		<div className="edit-frame-container">
			<div className="flex-col flex">
				<div className="buttons-container flex">
					<Button kind="tertiary" onClick={hideEditFrame} renderIcon={SidePanelCloseFilled}>
						Close
					</Button>
					{isInCreateMode ? (
						<Button kind="primary" disabled={isSending} onClick={() => createAccount(newAccount, selectedRole)} renderIcon={CheckmarkOutline}>
							Create Account
						</Button>
					) : (
						<Button kind="primary" disabled={isSending} onClick={() => updateAccount(account!, newAccount, selectedRole)} renderIcon={CheckmarkOutline}>
							Save Changes
						</Button>
					)}
				</div>
				<h4 className="succes-message">{isSending ? <InlineLoading status="active" iconDescription="Loading" description="Saving changes..." /> : succesMessage}</h4>
				{isInCreateMode ? <h1 className="title">Create new account</h1> : <h1 className="title">{columnNames[0] + ": " + newAccount.username}</h1>}
			</div>
			<Form className="form">
				{columnNames.length == 0
					? [...Array(3)].map((e, i) => {
							return <TextInputSkeleton className="frame-input-field" key={i} />;
					  })
					: columnNames.map((columnName, i) => {
							return (
								<TextInput
									id={`${i}`}
									size="lg"
									labelText={`${columnName} :`}
									placeholder={isInCreateMode ? `Specify ${columnName}` : `${newAccount[columnName.toLowerCase() as keyof Account]}`}
									invalid={errorMessage ? true : false}
									invalidText={errorMessage}
									value={newAccount[columnName.toLowerCase() as keyof Account]}
									className="frame-input-field"
									key={i}
									onChange={(e) => inputValueChange(e, columnName)}
								/>
							);
					  })}
				<Select id="reader_user" labelText="Privileges" defaultValue={account ? account.privileges : "reader_user"}>
					{accountPrivileges.map((privilege, i) => (
						<SelectItem id={privilege} text={privilege} value={privilege} key={i} onClick={() => setSelectedRole(privilege)}>
							{privilege}
						</SelectItem>
					))}
				</Select>
				{isInCreateMode ? (
					<></>
				) : (
					<Button kind="danger--tertiary" onClick={() => deleteAccount(account ? account.id : emptyAccount.id)} className="delete-button" renderIcon={TrashCan}>
						Delete
					</Button>
				)}
			</Form>
		</div>
	);
};
export default AccountsSideFrame;