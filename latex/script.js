function renderContent() {
    const input = document.getElementById("latex-input").value;
    const output = document.getElementById("latex-output");

    const splitContent = input.split(/(\$[^\$]+\$)/g);

    output.innerHTML = splitContent.map(part => {
        if (part.startsWith('$') && part.endsWith('$')) {
            return `<span>$$${part.slice(1, -1)}$$</span>`;
        } else {
            return `<span>${part}</span>`;
        }
    }).join('');

    MathJax.typesetPromise([output]);
}

function clearInput() {
    document.getElementById("latex-input").value = '';
}

async function pasteText() {
    try {
        const text = await navigator.clipboard.readText();
        document.getElementById("latex-input").value = text;
    } catch (err) {
        console.error('Ошибка вставки текста: ', err);
    }
}

function copyText() {
    const input = document.getElementById("latex-input");
    input.select();
    document.execCommand('copy');
}

function saveAsImage() {
    const output = document.getElementById("latex-output");
    html2canvas(output).then(canvas => {
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = 'latex-output.png';
        link.click();
    });
}
