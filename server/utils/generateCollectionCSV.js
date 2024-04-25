export function generateCSV(tokensData) {
    const csvHeader = "Owner Address,Token ID\n";
    const csvRows = tokensData.map(token => `${token.owner},${token.tokenId}`).join('\n');
    return csvHeader + csvRows;
  }
  

  