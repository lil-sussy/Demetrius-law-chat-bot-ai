import React, { useEffect, useState, useRef, ChangeEvent } from "react";
import styled from "styled-components";
import s from "jquery";
import DataTable from "datatables.net-dt";
import "datatables.net-buttons-dt";
import "datatables.net-fixedheader-dt";
import "datatables.net-keytable-dt";
import "datatables.net-responsive-dt";
import "datatables.net-scroller-dt";
import "datatables.net-searchbuilder-dt";
import "datatables.net-select-dt";
import { Add, TrashCan, RequestQuote } from "@carbon/icons-react";
import { TextInputSkeleton, TextInput, FluidForm, Button, Search } from "@carbon/react";
import { emptyJudgment } from "../../requests/request";

import type { Judgment } from "../../requests/request";
import type { Api } from "datatables.net-dt";

import "datatables.net-dt/css/jquery.dataTables.min.css";
import "./table.scss";
/*
  SEE: https://github.com/dhobi/datatables.colResize for column resizing implementation
*/

interface JudgementTableProps {
	columnNames: string[] | null;
	userPriviliges: string;
	tableData: Judgment[] | null;
	showEditFrame: (e: any) => void;
	hideEditFrame: (e: any) => void;
	setSelectedData: (e: Judgment[]) => void;
	deleteSelectedRows: () => void;
	showJudgmentPanel: () => void;
}

const JudgementTable: React.FC<JudgementTableProps> = ({ columnNames, tableData, userPriviliges, showEditFrame,  hideEditFrame, setSelectedData, deleteSelectedRows, showJudgmentPanel }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [columns, setColumns] = useState<{ title: string }[]>([]);
  const [data, setData] = useState<string[][]>([]);
	const tableRefRef = useRef<HTMLTableElement>(null);
	let tableRef = useRef<Api<any>>();
	let selectedRows = [];

  
	function filterColumn(event: { target: HTMLInputElement; type: "change" }) {
		const target = event.target;
		tableRef.current!.column(target.id).search(target.value).draw();
	}

	function filterTable(event: { target: HTMLInputElement; type: "change" }) {
		const target = event.target;
		tableRef.current!.search(target.value).draw();
	}

  function findJudgmentByRef(reference: string): Judgment | undefined {
    for (let judgment of tableData!) {
      if (judgment.reference == reference) {
        return judgment;
      }
    }
  }

  useEffect(() => {
    if (tableData == null) return;
    const tableDataWithoutSummaries:Judgment[] = []
    for (let judgment of tableData) {
      const judgmentWithoutSummary = Object.assign({}, judgment);
      delete (judgmentWithoutSummary as { summary?: string })["summary"];
      delete (judgmentWithoutSummary as { pdf_path?: string })["pdf_path"];
      tableDataWithoutSummaries.push(judgmentWithoutSummary);
    }
    if (userPriviliges != 'reader_user')
      setData(tableDataWithoutSummaries.map((row) => [...Object.values(row), '<button class="edit-button-row">Edit</button>', '<button class="delete-button-row">Remove</button>'].map((cell) => cell.toString())));
    else
      setData(tableDataWithoutSummaries.map((row) => [...Object.values(row)].map((cell) => cell.toString())));
  }, [tableData])
  
	useEffect(() => {
    const actionPriviligesColumnNames = ["Edit", "Delete"];
		tableCSS(tableRef.current!);
		setLoading(tableData == null);
    
		if (tableData == null || columnNames == null) return;
    
		if (data.length === 0 || data[0].length != columns.length) {
      const cols = columnNames.filter((e) => e != "summary" && e != "pdf_path");
      if (userPriviliges != 'reader_user')
        cols.push(...actionPriviligesColumnNames);
      setColumns(
        [...cols!].map((e, i) => {
          return { title: e };
				})
			);
			const tableDataWithoutSummaries: Judgment[] = [];
			for (let judgment of tableData) {
        const judgmentWithoutSummary = Object.assign({}, judgment);
				delete (judgmentWithoutSummary as { summary?: string })["summary"];
        delete (judgmentWithoutSummary as { pdf_path?: string })["pdf_path"];
				tableDataWithoutSummaries.push(judgmentWithoutSummary);
			}
      if (userPriviliges != 'reader_user')
        setData(tableDataWithoutSummaries.map((row) => [...Object.values(row), '<button class="edit-button-row">Edit</button>', '<button class="delete-button-row">Remove</button>'].map((cell) => cell.toString())));
      else
        setData(tableDataWithoutSummaries.map((row) => [...Object.values(row)].map((cell) => cell.toString())));
			return;
		}
    tableRef.current = new DataTable(tableRefRef.current!, {
      dom: "Plfrtip",
      search: {},
      responsive: true,
      paging: false,
      scrollCollapse: true,
      scrollX: true,
      data: data,
      columns: columns,
      ordering: true,
      scrollY: "520px",
      select: true,
      pageLength: 200,
      buttons: ["add", "delete"],
    });
  
    tableRef.current.on("select", function (e) {
      const rows = tableRef.current!.rows({ selected: true }).data().toArray();
      const judgments: Judgment[] = [];
      for (let row of rows) {
        const judgment: Judgment | undefined = findJudgmentByRef(row[0]);
				if (judgment != undefined)
          judgments.push(judgment);
        // const judgment: Judgment = Object.assign({}, emptyJudgment);
        // Object.keys(judgment).forEach((key, i) => {
        //   judgment[key as unknown as keyof Judgment] = row[i] as Judgment[keyof Judgment];
        // });
        // judgments.push(judgment);
      }
      selectedRows = judgments as Judgment[];
      setSelectedData(selectedRows);
      e.stopPropagation();
    });
    tableRef.current.on("unselect", function (e, dt, type, indexes) {
      setSelectedData([]);
    });
    tableRef.current.on("deselect", function (e, dt, type, indexes) {
      setSelectedData([]);
    });
    tableRef.current.on("click", function (e) {
      if (s(e.target!).is(":button")) {
        // @ts-ignore
        const row = tableRef.current!.rows(e.target.parentNode.parentNode).data().toArray()[0];
        const judgment: Judgment | undefined = findJudgmentByRef(row[0]);
				if (judgment == undefined) selectedRows = [] as Judgment[];
				else selectedRows = [judgment] as Judgment[];
        // const judgment: Judgment = Object.assign({}, emptyJudgment);
        // Object.keys(judgment).forEach((key, i) => {
        //   judgment[key as unknown as keyof Judgment] = row[i] as Judgment[keyof Judgment];
        // });
        // selectedRows = [judgment] as Judgment[];
        setSelectedData(selectedRows);
        if (s(e.target!).text() === "Edit") {
          showEditFrame(e);
          e.stopPropagation();
        } else {
          deleteSelectedRows();
        }
        // @ts-ignore
      } else if (e.detail == 2) {
        if (s(e.target!).is("tr") || s(e.target!).is("td")) {
          // @ts-ignore
          const row = tableRef.current!.rows(e.target!).data().toArray()[0];
          const judgment: Judgment|undefined = findJudgmentByRef(row[0])
          // Object.keys(judgment).forEach((key, i) => {
          //   judgment[key as unknown as keyof Judgment] = row[i] as Judgment[keyof Judgment];
          // });
          if (judgment == undefined)
            selectedRows = [] as Judgment[]
          else
            selectedRows = [judgment] as Judgment[]
          setSelectedData(selectedRows);
          showJudgmentPanel();
          e.stopPropagation();
        }
      }
    });
    tableRef.current.columns.adjust().draw();
  
    // $(document).on("keyup", function (e) {
    // 	const target = e.target as HTMLElement | Document;
    // 	if (target instanceof HTMLElement) if (target.tagName === "INPUT") return;
    // 	if (e.keyCode >= 48 && e.keyCode <= 57) {
    // 		// Number
    // 		tableRef.current!.search(e.key).draw();
    // 		$("#table_filter input").trigger("focus");
    // 	} else if (e.keyCode >= 65 && e.keyCode <= 90) {
    // 		// Alphabet upper case
    // 		tableRef.current!.search(e.key).draw();
    // 		$("#table_filter input").trigger("focus");
    // 	} else if (e.keyCode >= 97 && e.keyCode <= 122) {
    // 		// Alphabet lower case
    // 		tableRef.current!.search(e.key).draw();
    // 		$("#table_filter input").trigger("focus");
    // 	}
    // });
    tableCSS(tableRef.current!);
    return () => {
      tableRef.current!.destroy();
    };
	}, [tableData, columnNames, data, columns, loading]);

  if (tableData != null && data != null)
    if(tableData!.length < data!.length)
      return <></>
	return (
		<>
			<div className="table-container">
				<table ref={tableRefRef} id="table" className="dataTable table hover order-column row-border">
					<thead>
						<tr className="row-1">
							{columns.map((column, i) => (
								<th key={i}>{column.title}</th>
							))}
						</tr>
					</thead>
					<tbody>
						{data.length === 0
							? [...Array(15)].map((e, i) => {
									return (
										<tr key={i}>
											{[...Array(3)].map((e, i2) => {
												return <td key={i2}>{i2}</td>;
											})}
										</tr>
									);
							  })
							: data.map((row, index) => (
									<tr key={index}>
										{row.map((cell, cellIndex) => (
											<td key={cellIndex}>{
                        loading ? <TextInputSkeleton hideLabel/> : cell
                      }</td>
										))}
									</tr>
							  ))}
					</tbody>
					<tfoot className="footer">
						<tr>
							{columns.map((column, i) => (
								<th className="footer-search" key={i}>
									<div className="">
										<div className="footer">
											{i > columns.length - 3 ? (
												""
											) : (
												<FluidForm>
													<Search disabled={loading} size="sm" id={`${i}`} type="text" labelText="Search column" placeholder={`Search ${column.title}`} onChange={filterColumn} />
												</FluidForm>
											)}
										</div>
									</div>
								</th>
							))}
						</tr>
					</tfoot>
				</table>
			</div>
			<Search disabled={loading} id="filter-table" type="text" labelText="" placeholder="Search in the whole table" size="lg" onChange={filterTable} />
		</>
	);
};
export default JudgementTable;

function tableCSS(table: Api<any>) {
	// $(table).css({ width: "100%", display: "none" });
	//Editing the datatable
	s("#table_length").remove();
	s("#table_wrapper").prepend(s(".table-buttons"));
	s("#table_filter").remove();
	s("#table_info").remove();

	//Editing table filter (the searchbar)
	s("#table_wrapper .table-buttons").prepend(s("#table_filter"));
}