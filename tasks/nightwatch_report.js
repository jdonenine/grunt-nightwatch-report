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
    var indexFn = jade.compileFile("lib/templates/index.jade", jadeIndexOptions);
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
