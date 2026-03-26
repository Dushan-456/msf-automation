import React, { forwardRef } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  Cell,
} from "recharts";

const CustomizedAxisTick = (props) => {
  const { x, y, payload } = props;
  const words = payload.value.split("-");
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={15} textAnchor="middle" fill="#666" fontSize="11">
        {words[0].trim() + (words.length > 1 ? " -" : "")}
      </text>
      {words[1] && (
        <text x={0} y={29} textAnchor="middle" fill="#666" fontSize="11">
          {words.slice(1).join("-").trim()}
        </text>
      )}
    </g>
  );
};

const CustomizedYAxisTickQ2 = (props) => {
  const { x, y, payload } = props;
  const rawText = payload.value || "";

  const maxLineLength = 26;
  const words = rawText.split(" ");
  const lines = [];
  let currentLine = "";

  for (let i = 0; i < words.length; i++) {
    if ((currentLine + " " + words[i]).length > maxLineLength) {
      if (currentLine) lines.push(currentLine.trim());
      currentLine = words[i];
    } else {
      currentLine += (currentLine ? " " : "") + words[i];
    }
  }
  if (currentLine) lines.push(currentLine.trim());

  if (lines.length > 5) {
    lines[4] = lines[4] + "...";
    lines.length = 5;
  }

  const lineHeight = 12;
  const startY = -((lines.length - 1) * lineHeight) / 2;

  return (
    <g transform={`translate(${x},${y})`}>
      <text textAnchor="end" fill="#666" fontSize="11">
        {lines.map((line, i) => (
          <tspan key={i} x={-10} dy={i === 0 ? startY + 4 : lineHeight}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
};

const PrintableReport = forwardRef(({ survey, data }, ref) => {
  if (!data || !data.details || !data.rollups || !data.bulk) {
    return null;
  }

  // Parses survey title to extract Doctor, Trainer, and Specialty
  const getHeaderInfo = () => {
    let doctorName = "";
    let trainerName = "";
    let specialty = "";

    if (survey && survey.title) {
      let text = survey.title
        .replace(/Multisource Feedback Form \(MSF\)/i, "")
        .trim();

      const specialtyMatch = text.match(/Specialty\s*[-:]?\s*(.*)$/i);
      if (specialtyMatch) {
        specialty = specialtyMatch[1].trim();
        text = text.replace(specialtyMatch[0], "").trim();
      }

      const trainerMatch = text.match(/Trainer\s*[-:]?\s*(.*)$/i);
      if (trainerMatch) {
        trainerName = trainerMatch[1].trim();
        text = text.replace(trainerMatch[0], "").trim();
      }

      if (text) {
        doctorName = text.trim();
      }
    }

    return { doctorName, trainerName, specialty };
  };

  const { doctorName, trainerName, specialty } = getHeaderInfo();

  // Extract rollups safely
  const getRollup = (questionIdx) => {
    return data.rollups.data[questionIdx]?.summary[0] || {};
  };

  const totalResponses = survey.response_count;

  // Q1 Processing (Professions)
  const q1Rollup = getRollup(0);
  const q1Choices = data.details.pages[0].questions[0].answers.choices || [];
  const processedQ1 = q1Choices
    .map((c) => {
      const stat = (q1Rollup.choices || []).find((r) => r.id === c.id);
      const count = stat ? stat.count : 0;
      const percentage =
        totalResponses > 0 ? ((count / totalResponses) * 100).toFixed(2) : 0;
      return { name: c.text, count, percentage };
    })
    .filter((c) => c.count > 0);

  // Q2 Processing (Matrix)
  const q2Rollup = getRollup(1);
  const q2Rows = data.details.pages[0].questions[1].answers.rows || [];
  const processedQ2 = q2Rows.map((row) => {
    const stat = (q2Rollup.rows || []).find((r) => r.id === row.id);
    const textRaw = row.text.replace(/<[^>]+>/g, "").trim();
    return {
      name: textRaw,
      average: stat && stat.stats ? parseFloat(stat.stats.mean.toFixed(2)) : 0,
    };
  });

  // Q3 Processing (Yes/No)
  const q3Rollup = getRollup(2);
  const q3Choices = data.details.pages[0].questions[2].answers.choices || [];
  const processedQ3 = q3Choices.map((c) => {
    const stat = (q3Rollup.choices || []).find((r) => r.id === c.id);
    const count = stat ? stat.count : 0;
    const percentage =
      totalResponses > 0 ? ((count / totalResponses) * 100).toFixed(2) : 0;
    return { name: c.text, count, percentage };
  });

  // Q4 Processing (Overall Rating 1-10)
  const q4Rollup = getRollup(3);
  const q4Choices = data.details.pages[0].questions[3].answers.choices || [];
  const processedQ4 = q4Choices.map((c) => {
    // Keep raw name to allow the customized XAxis tick to split and wrap the strings
    const stat = (q4Rollup.choices || []).find((r) => r.id === c.id);
    return {
      name: c.text,
      count: stat ? stat.count : 0,
    };
  });

  // Q1 & Q5 & Q6 Processing (Free Text)
  const q1Id = data.details.pages[0].questions[0].id;
  const q5Id = data.details.pages[0].questions[4].id;
  const q6Id = data.details.pages[0].questions[5].id;
  const q7Id = data.details.pages[0].questions[6].id; // Date

  const responses = data.bulk.data || [];
  const commentsQ1 = [];
  const commentsQ5 = [];

  responses.forEach((resp) => {
    const pages = resp.pages || [];
    if (pages.length > 0) {
      const qs = pages[0].questions || [];
      const q1Ans = qs.find((q) => q.id === q1Id);
      const q5Ans = qs.find((q) => q.id === q5Id);
      const q7Ans = qs.find((q) => q.id === q7Id); // date

      let dateSubmitted = "Undated";
      if (q7Ans && q7Ans.answers && q7Ans.answers[0]?.text) {
        dateSubmitted = q7Ans.answers[0].text;
      }

      // Parse Q5
      if (q5Ans && q5Ans.answers && q5Ans.answers[0]?.text) {
        commentsQ5.push({
          text: q5Ans.answers[0].text,
          date: dateSubmitted || resp.date_created.split("T")[0],
        });
      }

      // Parse Q1 Other
      if (q1Ans && q1Ans.answers) {
        const otherAns = q1Ans.answers.find(
          (a) =>
            a.text && a.text.trim().toLowerCase() !== "other (please specify)",
        );
        if (otherAns && otherAns.text && otherAns.text.trim()) {
          commentsQ1.push({
            text: otherAns.text.trim(),
            date: dateSubmitted || resp.date_created.split("T")[0],
          });
        }
      }
    }
  });

  // Custom colors for recharts and tables
  const smColors = [
    "#00c175",
    "#5379b4",
    "#f8c228",
    "#67c7cd",
    "#ff8e51",
    "#7f5c8e",
    "#FFC107",
    "#c6ba7d",
    "#de4f5a",
    "#768086",
  ];

  return (
    <div
      ref={ref}
      className="font-sans text-gray-900 bg-white"
      style={{ minHeight: "297mm", width: "210mm", boxSizing: "border-box" }}
    >
      {/* HEADER */}
      <div className="print-chunk  text-center  pb-4 border-b-2 border-gray-200">
        <h1 className="text-xl font-bold mb-2 whitespace-pre-line">
          {survey.title || "Multisource Feedback Form (MSF)"}
        </h1>
        <div className="text-sm text-gray-700 ">
          <ul>
            {doctorName && (
              <li>
                <span className="font-semibold">Doctor:</span> {doctorName}
              </li>
            )}
            {trainerName && (
              <li>
                <span className="font-semibold">Trainer:</span> {trainerName}
              </li>
            )}
            {specialty && (
              <li>
                <span className="font-semibold">Specialty:</span> {specialty}
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Q1: Professions */}
      <div className="print-chunk px-12 pb-12 mb-16 page-break-inside-avoid">
        <h2 className="text-xl font-normal text-center mb-1 text-gray-800">
          Q1 Profile of the Feedback Givers
        </h2>
        <div className="text-center text-sm text-gray-500 mb-8 mt-1">
          <span>Answered: {totalResponses}</span>
          <span className="ml-4">Skipped: 0</span>
        </div>
        <table className="w-full text-sm text-left border-collapse mb-8 border-b border-gray-100">
          <thead className="bg-[#f9f9f9] border-b border-gray-100">
            <tr>
              <th className="py-3 px-4 font-semibold text-gray-700">
                Answer Choices
              </th>
              <th className="py-3 px-4 font-semibold text-gray-700 w-1/4">
                Percentage
              </th>
              <th className="py-3 px-4 font-semibold text-gray-700 w-1/4">
                Responses
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {processedQ1.map((c, i) => (
              <tr key={i}>
                <td className="py-3 px-4 text-gray-800 flex items-center">
                  <span
                    className="inline-block w-4 h-4 rounded-full mr-3 shadow-sm"
                    style={{ backgroundColor: smColors[i % smColors.length] }}
                  ></span>
                  {c.name}
                </td>
                <td className="py-3 px-4 text-gray-600">{c.percentage}%</td>
                <td className="py-3 px-4 text-gray-600">{c.count}</td>
              </tr>
            ))}
            <tr className="bg-[#f9f9f9] border-t-2 border-gray-100 font-semibold">
              <td className="py-3 px-4 text-gray-900">Total</td>
              <td className="py-3 px-4 text-gray-900">-</td>
              <td className="py-3 px-4 text-gray-900">{totalResponses}</td>
            </tr>
          </tbody>
        </table>

        {/* Q1 'Other' Comments Table */}
        <table className="w-full text-sm text-left border-collapse border-b border-gray-100">
          <thead className="bg-[#f9f9f9] border-b border-gray-100">
            <tr>
              <th className="py-1 px-4 font-semibold text-gray-700 w-12 text-center">
                #
              </th>
              <th className="py-1 px-4 font-semibold text-gray-700">
                OTHER (PLEASE SPECIFY)
              </th>
              <th className="py-1 px-4 font-semibold text-gray-700 w-32 text-center">
                DATE
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {commentsQ1.length > 0 ? (
              commentsQ1.map((c, i) => (
                <tr key={i}>
                  <td className="py-1 px-4 text-gray-500 text-center">
                    {i + 1}
                  </td>
                  <td className="py-1 px-4 text-gray-800">{c.text}</td>
                  <td className="py-1 px-4 text-gray-600 font-medium whitespace-nowrap text-center">
                    {c.date}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="py-1 px-4"></td>
                <td className="py-1 px-4 text-gray-700 font-medium">
                  There are no responses.
                </td>
                <td className="py-1 px-4"></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Q2: Matrix Rating (Horizontal Bar Chart) */}
      <div className="print-chunk pr-6 pb-12 mb-16 page-break-inside-avoid">
        <h2 className="text-xl pl-6 font-normal text-center mb-1 text-gray-800">
          Q2 Feedback Received (Multi-source feedback is given using a scale of
          1 to 5 where 1 represents "Strongly Disagree" & 5 represents "Strongly
          Agree")
        </h2>
        <div className="text-center text-sm text-gray-500 mb-8 mt-1">
          <span>Answered: {totalResponses}</span>
          <span className="ml-4">Skipped: 0</span>
        </div>
        <div className="flex justify-center w-full mt-4">
          <div className="w-[100%] h-[420px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={processedQ2}
                margin={{ top: 5, right: 35, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="2 3" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 5]}
                  ticks={[0, 1, 2, 3, 4, 5]}
                  axisLine={{ stroke: "#8b8d91ff", strokeWidth: 1 }}
                  tickLine={false}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={210}
                  interval={0}
                  tick={<CustomizedYAxisTickQ2 />}
                  axisLine={{ stroke: "#8b8d91ff", strokeWidth: 1 }}
                  tickLine={false}
                />
                <Tooltip />
                <Bar
                  dataKey="average"
                  barSize={45}
                  radius={[0, 4, 4, 0]}
                  isAnimationActive={false}
                >
                  {processedQ2.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={smColors[index % smColors.length]}
                    />
                  ))}
                  <LabelList
                    dataKey="average"
                    position="center"
                    style={{
                      fill: "#635e5eff",
                      fontSize: 13,
                      fontWeight: "900",
                      stroke: "#fff",
                      strokeWidth: 3,
                      paintOrder: "stroke",
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Q3: Yes/No Honesty & Integrity */}
      <div className="print-chunk px-12 pb-12 mb-16 page-break-inside-avoid">
        <h2 className="text-xl font-normal text-center mb-1 text-gray-800">
          Q3 Response to the question : Honesty and Integrity: do you have
          anyconcerns?
        </h2>
        <div className="text-center text-sm text-gray-500 mb-8 mt-1">
          <span>Answered: {totalResponses}</span>
          <span className="ml-4">Skipped: 0</span>
        </div>
        <table className="w-full text-sm text-left border-collapse border-b border-gray-100">
          <thead className="bg-[#f9f9f9] border-b border-gray-100">
            <tr>
              <th className="py-3 px-4 font-semibold text-gray-700">
                Answer Choices
              </th>
              <th className="py-3 px-4 font-semibold text-gray-700 w-1/4">
                Percentage
              </th>
              <th className="py-3 px-4 font-semibold text-gray-700 w-1/4">
                Responses
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {processedQ3.map((c, i) => (
              <tr key={i}>
                <td className="py-3 px-4 text-gray-800 flex items-center">
                  <span
                    className="inline-block w-4 h-4 rounded-full mr-3 shadow-sm"
                    style={{ backgroundColor: smColors[i % smColors.length] }}
                  ></span>
                  {c.name}
                </td>
                <td className="py-3 px-4 text-gray-600">{c.percentage}%</td>
                <td className="py-3 px-4 text-gray-600">{c.count}</td>
              </tr>
            ))}
            <tr className="bg-[#f9f9f9] border-t-2 border-gray-100 font-semibold">
              <td className="py-3 px-4 text-gray-900">Total</td>
              <td className="py-3 px-4 text-gray-900">-</td>
              <td className="py-3 px-4 text-gray-900">{totalResponses}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Q4: Overall Rating (Vertical Bar Chart) */}
      <div className="print-chunk  pb-12 mb-16 page-break-inside-avoid">
        <h2 className="text-xl font-normal text-center mb-1 text-gray-800">
          Q4 Overall rating of trainee's professionalism (marked using a scale
          of 1- 10 where 1 is "very Poor" and 10 is " Extremely Good")
        </h2>
        <div className="text-center text-sm text-gray-500 mb-8 mt-1">
          <span>Answered: {totalResponses}</span>
          <span className="ml-4">Skipped: 0</span>
        </div>
        <div className="flex justify-center w-full mt-4">
          <div className="w-[90%] h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={processedQ4}
                margin={{ top: 20, right: 30, left: 0, bottom: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  interval={0}
                  tick={<CustomizedAxisTick />}
                  axisLine={{ stroke: "#8b8d91ff", strokeWidth: 1 }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={{ stroke: "#8b8d91ff", strokeWidth: 1 }}
                  tickLine={false}
                />
                <Tooltip />
                <Bar
                  dataKey="count"
                  fill="#4b5563"
                  barSize={45}
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                >
                  {processedQ4.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={smColors[index % smColors.length]}
                    />
                  ))}
                  <LabelList
                    dataKey="count"
                    position="top"
                    style={{ fill: "#333", fontSize: 12, fontWeight: "bold" }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Q5: Comments */}
      {commentsQ5.length > 0 && (
        <div className="print-chunk px-12 pb-12 mb-4">
          <h2 className="text-lg font-semibold mb-4 text-center border-b border-gray-200 pb-2">
            Q5 Comments
          </h2>
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-gray-100 border-b border-gray-300">
              <tr>
                <th className="py-3 px-4 w-12 text-center text-gray-600">#</th>
                <th className="py-3 px-4 text-gray-600">Responses</th>
                <th className="py-3 px-4 w-32 text-gray-600">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {commentsQ5.map((c, i) => (
                <tr key={i} className="align-top page-break-inside-avoid">
                  <td className=" px-4 text-center text-gray-500">{i + 1}</td>
                  <td className=" px-4 text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {c.text}
                  </td>
                  <td className=" px-4 text-gray-500 text-xs">{c.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CSS overrides for printing format */}
      <style type="text/css" media="print">
        {`
           @page { size: auto; margin: 20mm; }
           body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
           .page-break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
        `}
      </style>
    </div>
  );
});

export default PrintableReport;
