export const truncateTxId = (txId) => `${txId.slice(0, 6)}...${txId.slice(-4)}`;

export const formatAddress = (address: string): string => address && address.length > 8 ? `${address.substring(0, 4)}...${address.substring(address.length - 4)}` : address;


export const formatVoiAmount = (amount: number): string => {
    let formattedAmount = new Intl.NumberFormat('en-US', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 6 
    }).format(amount);
  
    formattedAmount = formattedAmount.replace(/(\.\d*?[1-9])0+$/, "$1");
  
    formattedAmount = formattedAmount.replace(/\.$/, '');
  
    return formattedAmount;
  };


  export const formatArc200Amount = (amount: number, decimals: number): string => {
    const power = Math.pow(10, decimals);
    const roundedAmount = Math.floor(amount * power) / power;

    let formattedAmount = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    }).format(roundedAmount);
    
    return formattedAmount;
};

export const formatArc200BalanceAmount = (amount: number, decimals: number): string => {
    const power = Math.pow(10, decimals);
    

    const roundedAmount = Math.floor(amount * power) / power;

    let formattedAmount = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(roundedAmount);
    
    return formattedAmount;
  };


