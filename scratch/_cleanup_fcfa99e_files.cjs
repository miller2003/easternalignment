const fs = require('fs');
const { execSync } = require('child_process');

try {
  // Get all files added in commit fcfa99e
  const output = execSync('git show --name-status fcfa99e', { encoding: 'utf8' });
  const lines = output.split('\n');
  const addedFiles = lines
    .filter(line => line.startsWith('A\t'))
    .map(line => line.split('\t')[1].trim());
  
  // Filter for reader reviews
  const reviewFiles = addedFiles.filter(f => f.startsWith('src/content/readers/'));
  
  let count = 0;
  for (const file of reviewFiles) {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      console.log('Deleted ' + file);
      count++;
    }
  }
  console.log(`Deleted ${count} review files.`);
} catch (e) {
  console.error(e);
}
