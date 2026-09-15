module.exports = {
  default: {
    requireModule: ['ts-node/register'],
    paths: ['features/**/*.feature'],
    require: ['tests/step_definitions/**/*.ts'],
    format: ['progress-bar', 'summary'],
    publishQuiet: true
  }
};