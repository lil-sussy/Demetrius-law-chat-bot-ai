import React, { useEffect, useState, useRef } from "react";
import styled from "styled-components";
import { Add, TrashCan, Search as SearchIcon } from "@carbon/icons-react";
import { TextInputSkeleton, Button, Theme, Search, Table, TableHead, TableRow, TableHeader, TableBody, TableCell, TableContainer, TableToolbar, TableToolbarContent, TableToolbarSearch, TableToolbarMenu, TableToolbarAction, ExpandableSearch, TableSelectRow, TableSelectAll, Tag } from "@carbon/react";
import ReactMarkdown from 'react-markdown';

// @ts-ignore
import { InlineLoading } from "@carbon/react";
import elasticlunr from "elasticlunr";
import { Layer } from "@carbon/react";

import type { Judgment } from '../../requests/request';

import "./judgmentTable.scss";
import { Checkbox } from "@carbon/react";
/*
  SEE: https://github.com/dhobi/datatables.colResize for column resizing implementation
*/

interface JudgementTableProps {
	showRowCreation: () => void;
	isSending: boolean;
	advancedSearch: () => void;
	columnNames: string[] | null;
	tableData: Judgment[] | null;
	showEditFrame: (e: Judgment) => void;
	hideEditFrame: (e: any) => void;
	selectedJudgments: string[];
	setSelectedJudgments: (judgment: string[]) => void;
	deleteSelectedRows: () => void;
	showJudgmentPanel: (judgment: Judgment) => void;
	userPriviliges: string;
	userAdvancedSearchInput: string;
	setUserAdvancedSearchInput: (input: string) => void;
	judgmentIsSending: { [ref: string]: boolean };
	judgmentSearchTerm: string;
	setJudgmentSearchTerm: (term: string) => void;
}

const JudgementTable: React.FC<JudgementTableProps> = ({
	userAdvancedSearchInput,
	setUserAdvancedSearchInput,
	judgmentIsSending,
	isSending,
	showRowCreation,
	advancedSearch,
	columnNames,
	tableData: backendJudgments,
	userPriviliges,
	showEditFrame,
	hideEditFrame,
	setSelectedJudgments,
	deleteSelectedRows,
	showJudgmentPanel,
	selectedJudgments,
	judgmentSearchTerm,
	setJudgmentSearchTerm,
}) => {
	const [loading, setLoading] = useState<boolean>(true);
	const [searchResults, setSearchResults] = useState<Partial<Judgment>[]>([]);
	const [judgments, setJudgments] = useState<Judgment[] | null>([]);
	const [columns, setColumns] = useState<string[]>([]);
	const [filters, setFilters] = useState<{ [name: string]: { selected: boolean; name: string } }>({});
	const [selectAll, setSelectAll] = useState<boolean>(false);
	const [callback, setCallback] = useState<{ xd: () => void } | null>(null);
	const indexRef = useRef<elasticlunr.Index<Judgment>>();

	useEffect(() => {
		indexRef.current = createIndex();
	}, []);

	useEffect(() => {
    if (backendJudgments == null) return;
		setJudgments(backendJudgments!);
	}, [backendJudgments]);

	useEffect(() => {
		if (callback != null) callback.xd();
	}, [selectedJudgments]);

	useEffect(() => {
		setLoading(judgments == null);
		if (judgments ==  null || judgments == undefined || judgments.length == 0) return;
		const judgmentList: Partial<Judgment>[] = objectListWithoutKeys(judgments, ["pdf_path"]);
		const filterList: { [name: string]: { name: string; selected: boolean } } = {};
		const columnList: string[] = ["reference", "Name", "Summary"];
		Object.keys(judgmentList[0]).map((name) => {
			if (name != "pdf_path" && name != "pricing" && name != "relevance") {
				filterList[name] = { selected: true, name: name };
				if (name != "name" && name != "summary" && name != "reference" && name != "relevance") columnList.push(name);
			}
		});
		setFilters(filterList);
		setSearchResults(judgmentList);
		setColumns(columnList);
		judgments.forEach((judgment) => {
			indexRef.current!.addDoc(judgment);
		});
	}, [judgments]);

	useEffect(() => {
		if (judgments == null) return;
		if (judgmentSearchTerm.trim().length == 0) {
			setSearchResults(objectListWithoutKeys(judgments, ["pdf_path"]));
			return;
		}
		const results = searchJudgments(indexRef, judgmentSearchTerm.trim(), Object.keys(filters).filter((name) => filters[name].selected) as SearchField[]);
		const mappedResults = results.map((result) => judgments.find((j) => j.reference === result.ref)).filter((judgment): judgment is Judgment => judgment !== undefined);
		const judgmentList: Partial<Judgment>[] = objectListWithoutKeys(mappedResults, ["pdf_path"]);
		setSearchResults(judgmentList);
	}, [judgmentSearchTerm, filters]);

	function handleChange(event: { target: HTMLInputElement; type: "change" }) {
		setJudgmentSearchTerm(event.target.value);
	}

	function getJudgmentFromRow(row: Partial<Judgment>): Judgment | null {
		let selectedJudgment: Judgment | null = null;
		for (let judgment of backendJudgments!) {
			if (judgment.reference == row.reference!) {
				selectedJudgment = judgment;
				break;
			}
		}
		return selectedJudgment;
	}

	function handleDeleteButton(e: any, row: Partial<Judgment>) {
		const judgment = getJudgmentFromRow(row);
		setSelectedJudgments([...selectedJudgments, judgment!.reference]);
		setCallback({
			xd: () => {
				deleteSelectedRows();
				setCallback(null);
			},
		});
	}

	function handleEditButton(e: any, row: Partial<Judgment>) {
		const judgment = getJudgmentFromRow(row);
		showEditFrame(judgment!);
	}

	function handleSelectAll(e: any) {
		if (!selectAll) {
			const judgments = [];
			const selectedRefs: { [key: string]: boolean } = {};
			for (let pjudgment of searchResults) {
				const judgment = getJudgmentFromRow(pjudgment);
				judgments.push(judgment!);
				selectedRefs[judgment!.reference] = true;
			}
			setSelectedJudgments(judgments.map((judgment) => judgment.reference));
			setSelectAll(true);
		} else {
			const selectedRefs: { [key: string]: boolean } = {};
			for (let pjudgment of searchResults) {
				selectedRefs[pjudgment.reference!] = false;
			}
			setSelectedJudgments([]);
			setSelectAll(false);
		}
	}

	function handleSelectRow(row: Partial<Judgment>) {
		const selectedJudgment = getJudgmentFromRow(row);
		if (selectedJudgment == null) return;
		if (selectedJudgments.includes(selectedJudgment.reference)) {
			setSelectedJudgments(selectedJudgments.filter((ref) => ref != selectedJudgment.reference));
			setSelectAll(false);
		} else {
			setSelectedJudgments([...selectedJudgments, selectedJudgment.reference]);
		}
	}

	function handleRowClick(e: React.MouseEvent<HTMLTableRowElement, MouseEvent>, row: Partial<Judgment>) {
		if (e.detail == 2) showJudgmentPanel(getJudgmentFromRow(row)!);
		else handleSelectRow(row);
		e.preventDefault();
	}

	function handleAdvancedSearch() {
		advancedSearch();
	}

	function handleMessageKeyPress(e: any) {
		e.key == "Enter" && !e.shiftKey && !loading && handleAdvancedSearch();
	}
	function handleMessageInput(e: any) {
		setUserAdvancedSearchInput(e.target.value);
	}

	return (
		<div className="frame-31">
			<Layer level={0} className="table-buttons-container">
				<Search disabled={false} className="main-search-bar" value={userAdvancedSearchInput} labelText="" placeholder="Advanced summaries search, press enter to start searchrequest..." onKeyDown={(e) => handleMessageKeyPress(e)} onChange={(e) => handleMessageInput(e)} />
				<Button kind="primary" disabled={loading} className="search-button" onClick={(e) => handleAdvancedSearch()} renderIcon={SearchIcon}>
					{loading ? <InlineLoading status="active" iconDescription="Loading" description="Searching..." /> : "Search"}
				</Button>
				<Button kind="tertiary" disabled={loading || userPriviliges == "reader_user"} className="add-button" onClick={showRowCreation} renderIcon={Add}>
					New Judgment
				</Button>
				<Button kind="danger--tertiary" className="delete-button" disabled={selectedJudgments.length == 0 || isSending || userPriviliges == "reader_user"} onClick={deleteSelectedRows} renderIcon={TrashCan}>
					Delete Judgments
				</Button>
			</Layer>
			<Layer level={0} className="table-container-wrapper">
				<Layer level={0} className="judgments-table-decorator">
					{loading ? <InlineLoading status="active" iconDescription="Loading" description="Judgment list..." /> : <h2 className="table-title">Judgment list</h2>}
					<TableToolbar className="xd">
						<TableToolbarContent>
							<div className="judgments-table-toolbar">
								<Search disabled={false} className="main-search-bar" labelText="" placeholder="Search among the selected columns (filters)..." value={judgmentSearchTerm} onChange={(e) => handleChange(e)} />
								<div className="filter-selection-list">
									{Object.keys(filters).map((name: string, index) => {
										return (
											<Tag key={index} id={name} className={"filter-checkbox " + (filters[name].selected ? " filter-selected" : "")} type={filters[name].selected ? "cyan" : "warm-gray"} title="Clear Filter" labelText={name} onClick={() => setFilters({ ...filters, [name]: { selected: !filters[name].selected, name: name } })}>
												{name}
											</Tag>
										);
									})}
								</div>
							</div>
						</TableToolbarContent>
					</TableToolbar>
				</Layer>
				<div className="judgments-table-container">
					<div className="judgments-table-scrollcontainer">
						<Table className="judgments-table-xd" isSortable size="lg">
							<colgroup>
								<col className="cringe" style={{ width: "3rem" }} />
								<col className="reference-name-col" />
								<col className="summary-col" />
								{Object.keys(filters).map((name: string, index) => {
									if (name != "name" && name != "summary" && name != "reference" && name != "pricing") return <col className={name + "-col col " + filters[name].selected ? "selected-col" : ""} />;
									else return <></>;
								})}
								{userPriviliges != "reader_user" ? (
									<>
										<col className="edit-col col" />
										<col className="delete-col col" />
									</>
								) : (
									<></>
								)}
							</colgroup>
							<TableHead className="judgments-table-header">
								<TableRow className="judgments-table-header">
									<TableSelectAll ariaLabel="" id={"xd"} name="xd" onSelect={(e) => handleSelectAll(e)} checked={selectAll} />
									<TableHeader isSortable key={"name and ref"}>
										Name and Reference
									</TableHeader>
									{columns.map((column, index) => {
										if (column != "reference" && column != "Name" && column != "pricing")
											return (
												<TableHeader isSortable key={index}>
													{column}
												</TableHeader>
											);
									})}
									{userPriviliges != "reader_user" ? (
										<>
											<TableHeader key="edit">edit</TableHeader>
											<TableHeader key="remove">remove</TableHeader>
										</>
									) : (
										<></>
									)}
								</TableRow>
							</TableHead>
							<TableBody>
								{searchResults.map((judgment, index) => (
									<TableRow onClick={(e) => handleRowClick(e, judgment)} key={index}>
										<TableSelectRow ariaLabel="" id={judgment.reference!} name={judgment.reference!} onSelect={(e) => handleSelectRow(judgment)} checked={selectedJudgments.includes(judgment.reference!)} />
										<TableCell className="reference-td" key={"ref"}>
											<div className="judgment-row-ref-container">
												<h3 className="judgment-row-ref">{judgment.reference}</h3>
												<div className="row-name-container">
													<h4 className="judgment-row-name">{judgment.name}</h4>
												</div>
											</div>
										</TableCell>
										<TableCell className="summary-td" key={"index"}>
											{judgmentIsSending[judgment.reference!] ? (
												<InlineLoading status="active" labelText="" description="Generating summary..." iconDescription="Loading" />
											) : (
												<div className="summary-scroll">
													<ReactMarkdown>{judgment.summary}</ReactMarkdown>
												</div>
											)}
										</TableCell>
										{Object.keys(judgment).map((key, index) => {
											if (key != "summary" && key != "name" && key != "reference" && key != "pdf_path" && key != "pricing") return <TableCell key={index}>{judgment[key as unknown as keyof Judgment]}</TableCell>;
											else return <></>;
										})}
										{userPriviliges != "reader_user" ? (
											<>
												<TableCell key="edit">
													<Button onClick={(e) => handleEditButton(e, judgment)} className="in-table-button" kind="ghost">
														Edit
													</Button>
												</TableCell>
												<TableCell key="remove">
													<Button onClick={(e) => handleDeleteButton(e, judgment)} className="in-table-button" kind="danger--ghost">
														Delete
													</Button>
												</TableCell>
											</>
										) : (
											<></>
										)}
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				</div>
				{/* <Table userPriviliges={userPriviliges} showJudgmentPanel={showJudgmentPanel} columnNames={columnNames} hideEditFrame={hideEditFrame} setSelectedData={setSelected} showEditFrame={showEditFrame} tableData={tableData} deleteSelectedRows={deleteSelectedRows} /> */}
			</Layer>
		</div>
	);
};

function objectListWithoutKeys<T extends object, K extends keyof T>(list: T[], keys: K[]): Omit<T, K>[] {
  // list!.map((judgment) => {
	// 	const judgmentWithoutPath: Partial<Judgment> = { ...judgment };
	// 	delete judgmentWithoutPath.pdf_path;
	// 	return judgmentWithoutPath;
	// });
  return list.map((object) => {
    const newObject = { ...object };
    keys.forEach((key) => delete newObject[key]);
    return newObject;
  });
}

type SearchField = keyof Judgment;
const searchJudgments = (indexRef: React.MutableRefObject<elasticlunr.Index<Judgment> | undefined>, query: string, fields: SearchField[]): elasticlunr.SearchResults[] => {
  if (!indexRef.current) {
    return [];
  }
  if (query.length == 0) return indexRef.current.search("*");
  return indexRef.current.search(query, {
		fields: fields.reduce((fieldSet, field) => {
			fieldSet[field] = { boost: field == "summary" ? 3 : 1, bool: "OR" };
			return fieldSet;
		}, {} as elasticlunr.FieldSearchConfig<Judgment>),
		expand: true,
	});
};

const createIndex = (): elasticlunr.Index<Judgment> => {
	return elasticlunr(function (this: elasticlunr.Index<Judgment>) {
		this.addField("reference");
		this.addField("name");
		this.addField("jurisdiction");
		this.addField("summary");
		this.addField("judges");
		this.setRef("reference");
	});
};

export default JudgementTable;