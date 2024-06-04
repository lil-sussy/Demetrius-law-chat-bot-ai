import React, { useEffect, useState, useRef } from "react";
import styled from "styled-components";
import { SidePanelCloseFilled, Download, Copy, TaskAdd } from "@carbon/icons-react";
import { TextInputSkeleton, Button, IconButton, Theme, } from "@carbon/react";
import { Layer } from "@carbon/react";
import Table from './Table'
import ReactMarkdown from "react-markdown";
import { address } from "../../requests/request";

import type { Judgment } from "../../requests/request";

import "./judgmentPanel.scss";
// @ts-ignore
import { InlineLoading } from "@carbon/react";

interface JudgementTableProps {
	judgmentData: Judgment;
	closePanel: () => void;
	judgmentIsSending: { [ref: string]: boolean };
}

const JudgmentTable: React.FC<JudgementTableProps> = ({ judgmentData, judgmentIsSending, closePanel }) => {
	if (judgmentData == undefined) {
		return <></>;
	}

	const url = address + "/api/jst/get/file/" + judgmentData.reference.replaceAll(" ", "%20") + "/";

	function handleClose() {
		closePanel();
	}

	function copySummaryToClipboard() {
		navigator.clipboard.writeText(judgmentData.summary);
	}

	return (
		<div className="judgment-panel-container">
			<div className="judgment-panel-scroll">
				<div className="panel-header">
					<Button kind="tertiary" className="close-button" renderIcon={SidePanelCloseFilled} onClick={handleClose}>
						Close
					</Button>
					<Button kind="primary" size="lg" className="download-button" renderIcon={Download} href={url}>
						Download in PDF
					</Button>
				</div>
				<h1 className="judgment-reference">Reference : {judgmentData.reference}</h1>
				<div className="judgment-content">
					<h4 className="judgment-title">{judgmentData.name}</h4>
					<h4>Jurisdiction : {judgmentData.jurisdiction}</h4>
					<h4>Judges : {judgmentData.judges}</h4>
				</div>
				<div className="judgment-summary">
					<div className="summary-title-container">
						<h4 className="summary-title">
							Summary <span>#generated</span> <span className="judgment-pricing">${Math.round((judgmentData.pricing as unknown as number) * 100) / 100}</span>
						</h4>
						<IconButton label="copy in clipboard" kind="ghost" renderIcon={Copy} onClick={copySummaryToClipboard} />
					</div>
					<hr />
					<p className="summary">
						{judgmentIsSending[judgmentData.reference] ?
              <InlineLoading description="Generating summary..." status="active" />
            :
              <ReactMarkdown>{judgmentData.summary}</ReactMarkdown>
            }
					</p>
				</div>
				<div className="pdf-viewer-container">
					<iframe src={url} width="100%" height="100%">
						<p>
							Alternative text - include a link <a href={url}>to the PDF!</a>
						</p>
					</iframe>
				</div>
			</div>
		</div>
	);
};

export default JudgmentTable;