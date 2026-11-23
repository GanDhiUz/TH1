# index.html + mobile-src/mobile.css + mobile-src/mobile.js -> index-mobile.html
# index.html은 건드리지 않고, 휴대폰 전용 블록 두 개만 끼워 넣은 새 파일을 만든다.
import pathlib
root = pathlib.Path(__file__).resolve().parent.parent
src = (root / 'index.html').read_text(encoding='utf-8')
css = (root / 'mobile-src' / 'mobile.css').read_text(encoding='utf-8')
js = (root / 'mobile-src' / 'mobile.js').read_text(encoding='utf-8')
assert src.count('</head>') == 1 and src.rstrip().endswith('</html>')
out = src.replace('</head>', css + '</head>', 1)
i = out.rfind('</body>')
out = out[:i] + js + out[i:]
(root / 'index-mobile.html').write_text(out, encoding='utf-8')
print('wrote index-mobile.html', len(out))
