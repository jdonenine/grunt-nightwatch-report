/*
 * grunt-nightwatch-report
 * https://github.com/jdonenine/grunt-nightwatch-report
 *
 * Copyright (c) 2015 Jeffry DiNoto
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    // Before generating any new files, remove any previously-created files.
    clean: {
      tests: ['test/reports/summary/']
    },
                   
    nightwatch_report: {
      files: ['test/reports/**/*.xml'],
      options: {
        outputDir: 'test/reports/summary'
      }
    }

  });

  // Actually load this plugin's task(s).
  grunt.loadTasks('tasks');

  grunt.loadNpmTasks('grunt-contrib-clean');
    
  grunt.registerTask('gen-test', ['clean', 'nightwatch_report']);
    
  grunt.registerTask('default', ['gen-test']);

};
