function showTable(tableId, limit) {
    const tables = ['allContainer'];
    
    tables.forEach(table => {
        const element = document.getElementById(table);
        if (element) {
            if (table === tableId) {
                element.style.display = 'block';
                limitTableRows(limit);
            } else {
                element.style.display = 'none';
            }
        }
    });
}

function limitTableRows(limit) {
    const css = `
        .top-10 { display: table-row; }
        .top-100 { display: ${limit === 'all' || limit >= 100 ? 'table-row' : 'none'}; }
        .top-500 { display: ${limit === 'all' || limit >= 500 ? 'table-row' : 'none'}; }
        .after-500 { display: ${limit === 'all' || limit > 500 ? 'table-row' : 'none'}; }
    `;

    const style = document.createElement('style');
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);
}