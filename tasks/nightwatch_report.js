/*
* grunt-nightwatch-report
* https://github.com/jdonenine/grunt-nightwatch-report
*
* Copyright (c) 2015 Jeffry DiNoto
* Licensed under the MIT license.
*/

'use strict';

var fs = require('fs');
var xml2js = require('xml2js');
var S = require('string');
var mkdirp = require('mkdirp');
var jade = require('jade');

var jadeTemplateIndexHtml = "doctype html\n" +
"html(lang='en')\n" +
"  head\n" +
"    meta(charset='utf-8')\n" +
"    meta(http-equiv='X-UA-Compatible', content='IE=edge')\n" +
"    meta(name='viewport', content='width=device-width, initial-scale=1')\n" +
"    title Nighwatch.js Testing Summary\n" +
"    link(rel='stylesheet', href='https://maxcdn.bootstrapcdn.com/bootstrap/3.3.4/css/bootstrap.min.css')\n" +
"    script(type='text/javascript', src='https://www.google.com/jsapi')\n" +
"    script(type='text/javascript').\n" +
"      google.load('visualization', '1', {packages:['corechart']});\n" +
"      google.setOnLoadCallback(drawSummaryChart);\n" +
"      function drawSummaryChart() {\n" +
"        var data = google.visualization.arrayToDataTable([\n" +
"          ['Result', 'Number of Tests'],\n" +
"          ['Success', #{numTests - numFailures - numErrors}],\n" +
"          ['Failure', #{numFailures}],\n" +
"          ['Error',  #{numErrors}]\n" +
"        ]);\n" +
"        var options = {\n" +
"          'chartArea': {'width': '90%', 'height': '90%'},\n" +
"          'legend': 'none',\n" +
"          colors: ['#d6e9c6', '#ebccd1', '#faebcc']\n" +
"        };\n" +
"        var chart = new google.visualization.PieChart(document.getElementById('summaryPieChart'));\n" +
"        chart.draw(data, options);\n" +
"      }\n" +
"\n" +
"  body\n" +
"    div.jumbotron\n" +
"      div.container\n" +
"        h1 Nightwatch.js Testing Summary\n" +
"        p \n" +
"            | This report summarizes a series of automated Nightwatch.js test suites.  This report was generated  \n" +
"            span= summaryReportGenDateTime\n" +
"            | .\n" +
"\n" +
"    div.container\n" +
"      div.row(style='text-align: center;')\n" +
"        div#summaryPieChart(style='width: 250px; height: 250px; display: inline-block; margin-left: auto; margin-right: auto;')\n" +
"\n" +
"    div.container\n" +
"      div.row\n" +
"        div.col-md-4\n" +
"          h2 Test Suites\n" +
"          p \n" +
"            | A total of \n" +
"            span= numTests\n" +
"            |  test suites were executed.\n" +
"        div.col-md-4\n" +
"          h2 Failures\n" +
"          p\n" +
"            span= numFailures\n" +
"            |  of those test suites failed.\n" +
"        div.col-md-4\n" +
"          h2 Errors\n" +
"          p\n" +
"            span= numErrors\n" +
"            |  of those test suites had errors. \n" +
"\n" +
"    div.container(style='margin-top: 20px;')\n" +
"        div.page-header\n" +
"            h1 Test Suites\n" +
"        - each suite in suites\n" +
"            div(class=(suite.numErrors < 1 && suite.numFailures < 1 && suite.numSkipped < 1) ? 'panel panel-success' : 'panel panel-danger')\n" +
"                div.panel-heading\n" +
"                    h3.panel-title= suite.name\n" +
"                div.panel-body\n" +
"                    div.row\n" +
"                        div.col-md-4(style='font-weight: bold;') Test Suite Report File\n" +
"                        div.col-md-8= suite.file\n" +
"                    div.row\n" +
"                        div.col-md-4(style='font-weight: bold;') Test Cases\n" +
"                        div.col-md-8= suite.numTests\n" +
"                    div.row\n" +
"                        div.col-md-4(style='font-weight: bold;') Test Cases with Failures \n" +
"                        div.col-md-8= suite.numFailures\n" +
"                    div.row\n" +
"                        div.col-md-4(style='font-weight: bold;') Test Cases with Errors \n" +
"                        div.col-md-8= suite.numErrors\n" +
"                    div.row\n" +
"                        div.col-md-4(style='font-weight: bold;') Test Cases Skipped \n" +
"                        div.col-md-8= suite.numSkipped\n" +
"                    div.row\n" +
"                        div.col-md-4(style='font-weight: bold;') Run Time\n" +
"                        div.col-md-8\n" +
"                            span= suite.executionTime\n" +
"                            | s\n" +
"                    div.row\n" +
"                        div.col-md-4(style='font-weight: bold;') Timestamp\n" +
"                        div.col-md-8= suite.timestamp\n" +
"                    h3 Test Cases\n" +
"                    - each testcase in suite.cases\n" +
"                        div(class=(testcase.numFailures < 1 && testcase.numSkipped < 1) ? 'panel panel-success' : 'panel panel-danger')\n" +
"                            div.panel-heading\n" +
"                                h3.panel-title= testcase.name\n" +
"                            div.panel-body\n" +
"                                div.row\n" +
"                                    div.col-md-4(style='font-weight: bold;') Assertions\n" +
"                                    div.col-md-8= testcase.numAssertions\n" +
"                                div.row\n" +
"                                    div.col-md-4(style='font-weight: bold;') Assertions Failed\n" +
"                                    div.col-md-8= testcase.numFailures\n" +
"                                div.row\n" +
"                                    div.col-md-4(style='font-weight: bold;') Assertions Skipped\n" +
"                                    div.col-md-8= testcase.numSkipped\n" +
"                                div.row\n" +
"                                    div.col-md-4(style='font-weight: bold;') Run Time\n" +
"                                    div.col-md-8\n" +
"                                        span= testcase.executionTime\n" +
"                                        | s\n" +
"                                - if (testcase.failures.length > 0)\n" +
"                                    h4 Failed Assertions\n" +
"                                    - each failure in testcase.failures\n" +
"                                        div.panel.panel-danger\n" +
"                                            div.panel-heading\n" +
"                                                h3.panel-title Failed Assertion\n" +
"                                            div.panel-body\n" +
"                                                -if (failure.message && failure.message.message && failure.message.message.length > 0)\n" +
"                                                    div.well.well-lg= failure.message.message\n" +
"                                                -else\n" +
"                                                    div.well.well-lg No failure message was provided.\n" +
"                                                -if (failure.details && failure.details.length > 0)\n" +
"                                                    pre.pre-scrollable= failure.details\n" +
"\n" +
"    script(src='https://ajax.googleapis.com/ajax/libs/jquery/1.11.2/jquery.min.js')\n" +
"    script(src='https://maxcdn.bootstrapcdn.com/bootstrap/3.3.4/js/bootstrap.min.js')"

function writeSummaryJsonToFile(outputDir, summaryJsonString, grunt) {
    if (!outputDir)
        return;
    if (!summaryJsonString)
        summaryJsonString = "";
    
    var outputDirS = S(outputDir);
    outputDirS = outputDirS.trim();
    while (outputDirS.endsWith("/") || outputDirS.endsWith("\\")) {
        if (outputDirS.endsWith("/"))
            outputDirS = outputDirS.chompRight("/");
        if (outputDirS.endsWith("\\"))
            outputDirS = outputDirS.chompRight("\\");
    }
    outputDir = outputDirS.s + "/";

    var summaryDir = outputDir + "summary_";
    var now = new Date();
    summaryDir += now.getTime();
    grunt.log.writeln("Creating directory for summary reports '" + summaryDir + "'");
    mkdirp.sync(summaryDir);

    var summaryFile = summaryDir + "/summary.json";
    fs.writeFileSync(summaryFile, summaryJsonString);
    return summaryDir;
}

function writeTemplatedSummaryReports(summary, outputDir, grunt) {
    if (!summary)
        return;
    if (!outputDir)
        return;
    if (!grunt)
        return;
	
    var jadeIndexOptions = {
        "pretty": true
    };
    var indexFn = jade.compile(jadeTemplateIndexHtml, jadeIndexOptions);
    var indexHtml = indexFn(summary);
    var indexHtmlPath = outputDir + "/index.html";
    fs.writeFileSync(indexHtmlPath, indexHtml);
    
    return indexHtmlPath;
}

module.exports = function(grunt) {

// Please see the Grunt documentation for more information regarding task
// creation: http://gruntjs.com/creating-tasks

    grunt.registerMultiTask('nightwatch_report', 'Aggregate and process Nightwatch.js test suite reports to create easy to digest HTML reports.', function() {
        var parser = new xml2js.Parser();
        
        var now = new Date();
        
        var summary = {
            numTests: 0,
            numFailures: 0,
            numErrors: 0,
            summaryReportGenDateTime: now.toLocaleString(),
            suites: []
        };
        
        this.filesSrc.forEach(function(filePath) {
            grunt.log.writeln("Processing Nightwatch.js test suite report '" + filePath + "'...");
            
            var xml = fs.readFileSync(filePath, {encoding: 'utf-8'});
            
            var parsingSuccess = true;
            
            parser.parseString(xml, function (err, json) {
                if (err) {
                    grunt.log.error("An error occured while processing test suite report: " + err);
                    parsingSuccess = false;
                    return;
                }
                
                var testsuites = json.testsuites;
                var suiteSummary = testsuites.$;
                summary.numTests = Number(suiteSummary.tests);
                summary.numFailures = Number(suiteSummary.failures);
                summary.numErrors = Number(suiteSummary.errors);
                
                var testsuiteArray = testsuites.testsuite;
                for (var i = 0; i < testsuiteArray.length; i++) {
                    var testsuite = testsuiteArray[i].$;
                    var suiteName = testsuite.name;
                    var suite = {
                        file: filePath,
                        name: testsuite.name,
                        numTests: Number(testsuite.tests),
                        numSkipped: Number(testsuite.skipped),
                        numFailures: Number(testsuite.failures),
                        numErrors: Number(testsuite.errors),
                        package: testsuite.package,
                        executionTime: Number(testsuite.time),
                        timestamp: testsuite.timestamp,
                        cases: []
                    };
                    
                    var testcaseArray = testsuiteArray[i].testcase;
                    
                    for (var y = 0; y < testcaseArray.length; y++) {
                        if (!testcaseArray[y])
                            continue;
                        
                        var testcase = testcaseArray[y].$;
                        if (!testcase)
                            continue;
                        
                        var failureArray = testcaseArray[y].failure;
                        var skippedArray = testcaseArray[y].skipped;
                        
                        var _case = {
                            name: testcase.name,
                            numFailures: 0,
                            failures: [],
                            numSkipped: 0,
                            skipped: []
                        };
                        
                        if (testcase.time != undefined && testcase.time != null)
                            _case.executionTime = Number(testcase.time);
                        if (testcase.assertions != undefined && testcase.assertions != null)
                            _case.numAssertions = Number(testcase.assertions);
                        
                        if (failureArray) {
                            for (var z = 0; z < failureArray.length; z++) {
                                _case.numFailures++;
                                var failure = failureArray[z];
                                if (!failure)
                                    continue;
                                
                                var f = {
                                    message: failure.$,
                                    details: failure._
                                }
                                _case.failures.push(f);
                            }
                        }
                        
                        if (skippedArray) {
                            for (var z = 0; z < skippedArray.length; z++) {
                                _case.numSkipped++;
                            }
                        }
                        
                        suite.cases.push(_case);
                    }
                    
                    summary.suites.push(suite);
                }
            });
            
            if (parsingSuccess) {
                grunt.log.writeln("Successfully parsed JSON from test suite report");
            } else {
                grunt.log.error("Unable to parse JSON from test suite report, test suite will not be included in final report");
                return;
            }
        
            grunt.log.writeln("Completed processing Nightwatch.js test suite report '" + filePath + "'");
        });
        
        var summaryJsonString = JSON.stringify(summary, null, 4);
        
        //Create a timestamp directory to generate reports to
        var options = grunt.config.get(["nightwatch_report", "options"]);
        var outputDir = "reports/summary";
        if (options && options.outputDir)
            outputDir = options.outputDir;
        else
            grunt.log.writeln("No 'outputDir' option was provided, using the current working directory.");
        
        var summaryDirPath = writeSummaryJsonToFile(outputDir, summaryJsonString, grunt);
        if (!summaryDirPath || !fs.existsSync(summaryDirPath)) {
            grunt.log.error("Unable to write report summary data to directory.");
            return;
        } else {
            var summaryFilePath = summaryDirPath + "/summary.json";
            if (!summaryFilePath || !fs.existsSync(summaryFilePath)) {
                grunt.log.error("Unable to write report summary data to file.");
                return;
            } else {
                grunt.log.writeln("Summary data written to '" + summaryFilePath + "'");
            }
        }
        
        var indexFile = writeTemplatedSummaryReports(summary, summaryDirPath, grunt);
        if (!indexFile || !fs.existsSync(indexFile)) {
            grunt.log.error("Unable to generate summary HTML report files.");
            return;
        } else {
            grunt.log.writeln("Summary HTML report has been generated and written to '" + indexFile + "'");
        }
    });

};
