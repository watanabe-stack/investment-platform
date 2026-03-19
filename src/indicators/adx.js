/**
 * ADX (Average Directional Index)
 * トレンドの強さ（方向ではなく）を0〜100で測定
 * ADX > 25: トレンド明確 → 順張り有効
 * ADX < 20: トレンドなし → 逆張り有効
 */
export function calcADX(data, period = 14) {
  if (data.length < period + 1) {
    return {
      adx: data.map(() => null),
      pdi: data.map(() => null),
      ndi: data.map(() => null),
    };
  }

  const pdm = [];
  const ndm = [];
  const tr = [];

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      pdm.push(0);
      ndm.push(0);
      tr.push(data[i].h - data[i].l);
      continue;
    }
    const up = data[i].h - data[i - 1].h;
    const dn = data[i - 1].l - data[i].l;
    pdm.push(up > dn && up > 0 ? up : 0);
    ndm.push(dn > up && dn > 0 ? dn : 0);
    tr.push(
      Math.max(
        data[i].h - data[i].l,
        Math.abs(data[i].h - data[i - 1].c),
        Math.abs(data[i].l - data[i - 1].c)
      )
    );
  }

  const smooth = (arr) => {
    const r = [];
    let s = 0;
    for (let i = 0; i < arr.length; i++) {
      if (i < period) {
        s += arr[i];
        r.push(i === period - 1 ? s : null);
      } else {
        s = s - s / period + arr[i];
        r.push(s);
      }
    }
    return r;
  };

  const sTR = smooth(tr);
  const sPDM = smooth(pdm);
  const sNDM = smooth(ndm);

  const pdi = sTR.map((v, i) =>
    v && sPDM[i] != null ? (sPDM[i] / v) * 100 : null
  );
  const ndi = sTR.map((v, i) =>
    v && sNDM[i] != null ? (sNDM[i] / v) * 100 : null
  );
  const dx = pdi.map((v, i) =>
    v != null && ndi[i] != null && v + ndi[i] !== 0
      ? (Math.abs(v - ndi[i]) / (v + ndi[i])) * 100
      : null
  );

  const adx = [];
  let adxAvg = null;
  for (let i = 0; i < dx.length; i++) {
    if (dx[i] === null) {
      adx.push(null);
      continue;
    }
    if (adxAvg === null) {
      const valid = dx.slice(0, i + 1).filter((v) => v !== null);
      if (valid.length >= period) {
        adxAvg = valid.slice(-period).reduce((s, v) => s + v, 0) / period;
      } else {
        adx.push(null);
        continue;
      }
    } else {
      adxAvg = (adxAvg * (period - 1) + dx[i]) / period;
    }
    adx.push(+adxAvg.toFixed(2));
  }

  return { adx, pdi, ndi };
}
