(function () {
    const voteList = ('PK FK KZ KF K KF K K K K K K K K K K G GK GK GP G GZ G GZ GZ G GK GZ G G G G G G G G G ' +
        'G G G G GZ GZ GK GH G GZ G GK PG ZG ZG ZG KG KG KG GP G GK GP GF GK F F F F F F F F FZ ZF PF PF Z ZP ' +
        'ZH PZ HZ HZ Z P HP N N S S A')
        .split(' ')
        .sort((a, b) => (a.length - b.length) || (a > b ? 1 : a < b ? -1 : 0))
        .map(v => v.split(''));
    const ballotCount = voteList.length;
    const endorsementThreshold = ballotCount * 2 / 3;
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
    const voteBoxes = {};
    Object.keys(candidates).forEach(function (c, i) {
        candidateColor[c] = colors[i];
        candidateIndex[c] = i;
        candidateCount[c] = 0;
        voteBoxes[c] = [];
    });
    candidateColor['N'] = '#888888';
    const boxHeight = 16;
    const boxWidth = boxHeight;
    const svg = makeSvgNode(
        'svg',
        {viewBox: '0,0 1000,1000', width: '100%'},
        document.getElementById('figure-container')
    );
    makeStyle();

    class VoteBox {

        constructor(votes, pos) {
            const g = makeSvgNode(
                'g',
                {transform: `translate(${pos[0]},${pos[1]})`},
                svg
            );
            if (votes.length === 2) {
                makeSvgNode(
                    'polygon',
                    {
                        points: `0,0 ${boxWidth},0 0,${boxHeight}`,
                        class: votes[0],
                    },
                    g
                );
                makeSvgNode(
                    'polygon',
                    {
                        points: `${boxWidth},0 ${boxWidth},${boxHeight} 0,${boxHeight}`,
                        class: votes[1],
                    },
                    g
                );
                makeSvgNode(
                    'text',
                    {
                        x: 0.25 * boxWidth,
                        y: 0.45 * boxHeight,
                        class: 'letter',
                    },
                    g,
                    votes[0]
                );
                makeSvgNode(
                    'text',
                    {
                        x: 0.75 * boxWidth,
                        y: 0.85 * boxHeight,
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
                        width: boxWidth,
                        height: boxHeight,
                        class: votes[0],
                    },
                    g
                );
                makeSvgNode(
                    'text',
                    {
                        x: 0.5 * boxWidth,
                        y: 0.65 * boxHeight,
                        class: 'letter',
                    },
                    g,
                    votes[0]
                );
            }
            makeSvgNode(
                'rect',
                {
                    width: boxWidth,
                    height: boxHeight,
                    class: 'border',
                },
                g
            );
            this.votes = votes;
            this.node = g;
            this.pos = pos;
            this.voteIndex = 0;
        }

        currentChoice() {
            return this.votes[this.voteIndex];
        }

        useNextChoice() {
            this.voteIndex++;
            return this.currentChoice();
        }

        secondChoice() {
            return this.votes[1];
        }

        moveTo(to) {
            const from = [this.pos[0], this.pos[1]];
            const steps = 60;
            const time = 500;
            const that = this;
            return new Promise(function (resolve) {
                for (let i = 0; i < steps; i++) {
                    const frac = (i + 1) / steps;
                    const x = from[0] + frac * (to[0] - from[0]);
                    const y = from[1] + frac * (to[1] - from[1]);
                    setTimeout(
                        function () {
                            that.pos = [x, y];
                            that.node.setAttribute('transform', `translate(${x},${y})`);
                            if (frac >= 1) {
                                resolve();
                            }
                        },
                        frac * time
                    );
                }
            });
        }

    }

    Object.keys(candidates).forEach(function (candidate) {
        makeSvgNode(
            'text',
            {
                x: 100,
                y: candidateY(candidate) + 0.8 * boxHeight,
                class: 'name',
            },
            svg,
            candidates[candidate]
        );
    });
    writeCounts();
    voteList.forEach(function (votes) {
        if (votes[0] === 'A' || votes[0] === 'S') {
            return;
        }
        const candidate = votes[0];
        const x = candidateX(candidate);
        const y = candidateY(candidate);
        candidateCount[candidate]++;
        voteBoxes[candidate].push(new VoteBox(votes, [x, y]));
    });
    doRounds().then(console.log)

    function doRounds() {
        const sortedCandidates = Object.keys(voteBoxes)
            .filter(c => c !== 'N')
            .sort((a, b) => candidateCount[a] - candidateCount[b]);
        const topCandidate = sortedCandidates[sortedCandidates.length - 1];
        if (candidateCount[topCandidate] >= endorsementThreshold) {
            return Promise.resolve(topCandidate);
        }
        if (sortedCandidates.length < 2) {
            return Promise.resolve();
        }
        const bottomCandidate = sortedCandidates[0];
        const boxesToMove = voteBoxes[bottomCandidate].reverse();
        const boxGroups = [];
        let prev = '';
        boxesToMove.forEach(function (box) {
            if (prev !== box.secondChoice()) {
                boxGroups.push([]);
            }
            boxGroups[boxGroups.length - 1].unshift(box);
            prev = box.secondChoice();
        });
        const tasks = boxGroups.map(function (boxGroup) {
            return function () {
                candidateCount[bottomCandidate] -= boxGroup.length;
                writeCounts();
                const promises = boxGroup.map(function (box) {
                    let toCandidate = box.useNextChoice() || 'N';
                    if (!voteBoxes[toCandidate]) {
                        toCandidate = 'N';
                    }
                    voteBoxes[toCandidate].push(box);
                    const pos = [candidateX(toCandidate), candidateY(toCandidate)];
                    candidateCount[toCandidate]++;
                    return box.moveTo(pos);
                });
                return Promise.all(promises).then(writeCounts);
            };
        });
        return tasks.reduce(
            (promiseChain, currentTask) => promiseChain = promiseChain.then(currentTask),
            Promise.resolve()
        )
            .then(function () {
                delete voteBoxes[bottomCandidate];
                return new Promise(function (resolve) {
                    setTimeout(() => resolve(doRounds()), 500);
                });
            });
    }

    function writeCounts() {
        const countNodes = document.getElementsByClassName('count');
        while (countNodes.length) {
            countNodes[0].parentNode.removeChild(countNodes[0]);
        }
        Object.keys(candidates).forEach(function (candidate) {
            makeSvgNode(
                'text',
                {
                    x: 125,
                    y: candidateY(candidate) + 0.8 * boxHeight,
                    class: 'count',
                },
                svg,
                candidateCount[candidate].toString()
            );
        });
    }

    function candidateX(candidate) {
        return 140 + candidateCount[candidate] * 1.1 * boxWidth;
    }

    function candidateY(candidate) {
        return 120 + candidateIndex[candidate] * 2 * boxHeight;
    }

    function makeStyle() {
        let style = '';
        Object.keys(candidateColor).forEach(c => style += `.${c} { fill: ${candidateColor[c]} }\n`);
        style += `.letter { font-size: ${0.45 * boxHeight}px; fill: black; text-anchor: middle }\n` +
            `.name { font-size: ${0.75 * boxHeight}px; fill: black; text-anchor: end }\n` +
            `.count { font-size: ${0.75 * boxHeight}px; fill: blue; text-anchor: end }\n` +
            `.border { stroke-width: ${boxHeight / 25}px; stroke: #bbbbbb; fill: transparent; }\n`;
        makeSvgNode('style', {}, svg, style);
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
})();

