(function () {
    const voteList = ('PK FK KZ KF K KF K K K K K K K K K K G GK GK GP G GZ G GZ GZ G GK GZ G G G G G G G G G ' +
        'G G G G GZ GZ GK GH G GZ G GK PG ZG ZG ZG KG KG KG GP G GK GP GF GK F F F F F F F F FZ ZF PF PF Z ZP ' +
        'ZH PZ HZ HZ Z P HP N N S S A')
        .split(' ')
        .sort((a, b) => (a.length - b.length) || (a > b ? 1 : a < b ? -1 : 0))
        .map(v => v.split(''));
    const candidates = {
        F: 'Fanning',
        G: 'Grossman',
        H: 'Hernandez',
        K: 'Kennedy',
        P: 'Putta',
        Z: 'Zhang',
        N: 'No endorsement',
    };
    const colors = ['#fb8072', '#8dd3c7', '#ffffb3', '#80b1d3', '#bebada', '#fdb462'];
    const candidateColor = {};
    const candidateIndex = {};
    const candidateCount = {};
    Object.keys(candidates).forEach(function (c, i) {
        candidateColor[c] = colors[i];
        candidateIndex[c] = i;
        candidateCount[c] = 0;
    });
    candidateColor['N'] = '#888888';
    const squareSide = 16;

    const svg = makeSvgNode(
        'svg',
        {viewBox: '0,0 1000,1000', width: '100%'},
        document.getElementById('figure-container')
    );
    makeStyle();
    Object.keys(candidates).forEach(function (candidate) {
        makeSvgNode(
            'text',
            {
                x: 110,
                y: 120 + candidateIndex[candidate] * 2 * squareSide + 0.8 * squareSide,
                class: 'name',
            },
            svg,
            candidates[candidate]
        );
    });
    const voteBoxes = [];
    voteList.forEach(function (votes) {
        if (votes[0] === 'A' || votes[0] === 'S') {
            return;
        }
        const candidate = votes[0];
        const x = 120 + candidateCount[candidate] * 1.1 * squareSide;
        candidateCount[candidate]++;
        const y = 120 + candidateIndex[candidate] * 2 * squareSide;
        voteBoxes.push(makeVoteBox(votes, x, y));
    });
    // move(voteBoxes[0], [500, 300])

    function makeStyle() {
        let style = '';
        Object.keys(candidateColor).forEach(c => style += `.${c} { fill: ${candidateColor[c]} }\n`);
        style += `.letter { font-size: ${0.4 * squareSide}px; fill: black; }\n` +
            `.name { font-size: ${0.8 * squareSide}px; fill: black; text-anchor: end }\n` +
            `.border { stroke-width: ${squareSide / 25}px; stroke: #bbbbbb; fill: transparent; }\n`;
        makeSvgNode('style', {}, svg, style);
    }

    function makeVoteBox(votes, x, y) {
        if (!Array.isArray(votes)) {
            votes = [votes];
        }
        const g = makeSvgNode(
            'g',
            {transform: `translate(${x},${y})`},
            svg
        );
        if (votes.length === 2) {
            makeSvgNode(
                'polygon',
                {
                    points: `0,0 ${squareSide},0 0,${squareSide}`,
                    class: votes[0],
                },
                g
            );
            makeSvgNode(
                'polygon',
                {
                    points: `${squareSide},0 ${squareSide},${squareSide} 0,${squareSide}`,
                    class: votes[1],
                },
                g
            );
            makeSvgNode(
                'text',
                {
                    x: 0.1 * squareSide,
                    y: 0.45 * squareSide,
                    class: 'letter',
                },
                g,
                votes[0]
            );
            makeSvgNode(
                'text',
                {
                    x: 0.6 * squareSide,
                    y: 0.85 * squareSide,
                    class: 'letter',
                },
                g,
                votes[1]
            );
        }
        else {
            makeSvgNode(
                'rect',
                {
                    width: squareSide,
                    height: squareSide,
                    class: votes[0],
                },
                g
            );
            makeSvgNode(
                'text',
                {
                    x: 0.35 * squareSide,
                    y: 0.65 * squareSide,
                    class: 'letter',
                },
                g,
                votes[0]
            );
        }
        makeSvgNode(
            'rect',
            {
                width: squareSide,
                height: squareSide,
                class: 'border',
            },
            g
        );
        return g;
    }

    function makeSvgNode(name, attr, parent, child) {
        const node = document.createElementNS('http://www.w3.org/2000/svg', name);
        if (!attr) {
            attr = {};
        }
        Object.keys(attr).forEach(function (key) {
            node.setAttribute(key, attr[key]);
        });
        if (child) {
            node.appendChild(document.createTextNode(child));
        }
        if (parent) {
            parent.appendChild(node);
        }
        return node;
    }

    function move(node, to) {
        const m = node.getAttribute('transform').match(/([-\d.]+)[, ]+([-\d.]+)/);
        const from = [+m[1], +m[2]];
        const steps = 60;
        const time = 500;
        for (let i = 0; i < steps; i++) {
            const frac = (i + 1) / steps;
            const x = from[0] + frac * (to[0] - from[0]);
            const y = from[1] + frac * (to[1] - from[1]);
            setTimeout(
                () => node.setAttribute('transform', `translate(${x},${y})`),
                (i + 1) * time / steps
            );
        }
    }
})();

