import { Link } from 'react-router-dom';
import { useApi } from '../api/useApi.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { ErrorState, GroupLabel, IucnBadge, Loading, PageHead, Empty } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { SpeciesThumb } from '../components/SpeciesPhoto.jsx';
import { ChartCard, ColumnChart, HBarChart } from '../components/charts.jsx';
import { GROUPS, IUCN, IUCN_BY_VALUE, needsCuration } from '../lib/taxa.js';
import { fmtNum } from '../lib/format.js';

export default function OverviewPage() {
  const { user } = useAuth();
  const species = useApi('/species');
  const dash = useApi('/dashboard/summary');
  const summary = useApi('/surveys/summary');
  const flagged = useApi(user ? '/surveys/sightings' : null, { flagged: 'true' });
  const charts = useApi('/dashboard/charts');
  const obsCounts = dash.data?.observations;

  const list = species.data ?? [];
  const threatened = list.filter((s) => IUCN_BY_VALUE[s.status]?.threatened);
  const curation = list.filter(needsCuration).length;
  const years = summary.data ?? [];
  const latest = years[years.length - 1];

  return (
    <div className="page">
      <PageHead
        title="Tổng quan"
        description={
          user
            ? 'Tình hình dữ liệu đa dạng sinh học bán đảo Sơn Trà: những gì đã ghi nhận và những gì đang chờ xử lý.'
            : 'Số liệu đa dạng sinh học bán đảo Sơn Trà, Đà Nẵng: các loài đã ghi nhận và kết quả khảo sát quần thể voọc chà vá chân nâu.'
        }
      />

      {species.error && <ErrorState error={species.error} onRetry={species.reload} />}

      <section className="stats" aria-label="Số liệu chính">
        <Stat label="Loài trong danh mục" value={species.data && list.length}>
          {!user ? (
            `${fmtNum(new Set(list.map((s) => s.family).filter(Boolean)).size)} họ · 5 nhóm sinh vật`
          ) : curation > 0 ? (
            <Link to="/loai?loc=can-bien-tap">{fmtNum(curation)} loài cần biên tập</Link>
          ) : (
            'Đã biên tập đầy đủ'
          )}
        </Stat>
        <Stat label="Loài bị đe doạ (IUCN)" value={species.data && threatened.length}>
          CR · EN · VU · EW
        </Stat>
        <Stat label={user ? 'Bản ghi quan sát' : 'Bản ghi quan sát đã xác nhận'} value={obsCounts && (user ? obsCounts.approved + obsCounts.pending + obsCounts.rejected : obsCounts.approved)}>
          {!user ? (
            'Quan sát thực địa và mẫu vật lưu giữ'
          ) : obsCounts?.pending ? (
            <Link to="/quan-sat?trang-thai=PENDING">{fmtNum(obsCounts.pending)} chờ duyệt</Link>
          ) : (
            'Không có bản ghi chờ duyệt'
          )}
        </Stat>
        <Stat label={latest ? `Cá thể voọc đếm trên tuyến ${latest.year}` : 'Khảo sát tuyến'} value={latest?.individuals}>
          {latest ? `${fmtNum(latest.groups)} đàn trên ${fmtNum(latest.transects)} tuyến` : 'Chưa có dữ liệu'}
        </Stat>
      </section>

      <div className="grid-2">
        <section className="panel">
          <div className="panel__head">
            <h2>Khảo sát tuyến theo năm</h2>
            <Link to={user ? '/khao-sat' : '/ban-do'} className="btn btn--sm btn--ghost">
              {user ? 'Chi tiết' : 'Xem trên bản đồ'}
              <Icon name="arrowRight" size={14} />
            </Link>
          </div>
          <div className="panel__body">
            {summary.loading && !summary.data ? <Loading /> : <SurveyCompare years={years} />}
          </div>
        </section>

        <section className="panel">
          <div className="panel__head">
            <h2>Bản ghi theo nhóm loài</h2>
          </div>
          <div className="panel__body">
            {species.loading && !species.data ? <Loading /> : <GroupBars species={list} />}
          </div>
        </section>
      </div>

      <div className={user ? 'grid-2 grid-2--even' : 'grid-2'}>
        {user && (
        <section className="panel">
          <div className="panel__head">
            <h2>Cần xử lý</h2>
          </div>
          <ul className="feed">
            <WorkItem
              to="/khao-sat?co=1"
              count={flagged.data?.length}
              label="điểm khảo sát bị gắn cờ"
              hint="Toạ độ hoặc độ cao bất thường — cần đối chiếu sổ thực địa."
            />
            <WorkItem
              to="/quan-sat?trang-thai=PENDING"
              count={obsCounts?.pending}
              label="quan sát chờ duyệt"
              hint="Kiểm lâm hoặc quản trị viên khác người gửi duyệt."
            />
            <WorkItem
              to="/loai?loc=can-bien-tap"
              count={species.data ? curation : undefined}
              label="loài chưa có tên Việt hoặc hạng IUCN"
              hint="Loài được tạo tự động khi nhập bộ dữ liệu."
            />
          </ul>
        </section>
        )}

        <section className="panel">
          <div className="panel__head">
            <h2>Loài bị đe doạ</h2>
            <span className="muted" style={{ fontSize: 'var(--text-sm)' }}>
              theo số bản ghi
            </span>
          </div>
          {species.loading && !species.data ? (
            <Loading />
          ) : threatened.length === 0 ? (
            <Empty title="Chưa có loài nào được xếp hạng đe doạ">Cập nhật hạng IUCN trong Danh mục loài.</Empty>
          ) : (
            <ul className="feed">
              {[...threatened]
                .sort((a, b) => b._count.observations - a._count.observations)
                .slice(0, 8)
                .map((s) => (
                  <li key={s.id} style={{ gridTemplateColumns: 'auto auto minmax(0, 1fr) auto', alignItems: 'center' }}>
                    <SpeciesThumb species={s} size={44} />
                    <IucnBadge status={s.status} />
                    <span style={{ minWidth: 0 }}>
                      {user ? (
                        <Link to={`/loai?id=${s.id}`} className="cell-title" style={{ textDecoration: 'none', color: 'inherit' }}>
                          {s.name}
                        </Link>
                      ) : (
                        <span className="cell-title">{s.name}</span>
                      )}
                      <div className="cell-sub sci">{s.scientificName}</div>
                    </span>
                    <span className="num muted">{fmtNum(s._count.observations)}</span>
                  </li>
                ))}
            </ul>
          )}
        </section>
      </div>

      <ChartsSection data={charts.data} error={charts.error} onRetry={charts.reload} loading={charts.loading && !charts.data} />
    </div>
  );
}

// Màu theo năm khảo sát: hai năm đầu dùng cặp xanh/cam đã kiểm tra CVD, năm thứ ba trở đi dùng xám.
const YEAR_COLORS = ['var(--series-a)', 'var(--series-b)', 'var(--series-neutral)'];
const yearSeries = (years) => years.map((y, i) => ({ key: String(y), label: String(y), color: YEAR_COLORS[Math.min(i, YEAR_COLORS.length - 1)] }));

function ChartsSection({ data, error, onRetry, loading }) {
  if (error) return <ErrorState error={error} onRetry={onRetry} />;
  if (loading || !data) {
    return (
      <div className="charts" aria-busy="true">
        {[0, 1, 2, 3].map((i) => (
          <section key={i} className="panel">
            <div className="panel__body">
              <Loading rows={5} />
            </div>
          </section>
        ))}
      </div>
    );
  }

  // 1. Bản ghi theo năm, chồng theo nhóm loài.
  const yearCats = data.observationsByYear.map((r) => ({ key: String(r.year), label: String(r.year) }));
  const yearData = Object.fromEntries(data.observationsByYear.map((r) => [String(r.year), r.groups]));
  const groupSeries = GROUPS.map((g) => ({ key: g.value, label: g.label, color: g.color }));

  // 2. Bản ghi theo tháng (gộp mọi năm).
  const monthCats = Array.from({ length: 12 }, (_, i) => ({ key: String(i + 1), label: String(i + 1), title: `Tháng ${i + 1}` }));
  const monthData = Object.fromEntries(data.observationsByMonth.map((r) => [String(r.month), { count: r.count }]));

  // 3. Hạng IUCN (bỏ "Chưa đánh giá" để không lấn át các hạng còn lại).
  const ne = data.speciesByStatus.find((s) => s.status === 'NE')?.count ?? 0;
  const iucnRows = IUCN.filter((s) => s.value !== 'NE')
    .map((s) => ({ key: s.value, label: `${s.value === 'HERITAGE' ? '' : `${s.value} · `}${s.label}`, value: data.speciesByStatus.find((x) => x.status === s.value)?.count ?? 0 }))
    .filter((r) => r.value > 0);

  // 4. Họ nhiều loài nhất.
  const familyRows = data.topFamilies.map((f) => ({ key: f.family, label: f.family, value: f.count }));

  // 5. Cỡ đàn voọc theo năm khảo sát.
  const surveyYears = [...new Set(data.sightingSizes.map((r) => r.year))].sort();
  const sizeSeries = yearSeries(surveyYears);
  const BUCKETS = Array.from({ length: 10 }, (_, i) => i + 1);
  const bucketOf = (n) => Math.min(n, 10);
  const sizeData = {};
  for (const b of BUCKETS) sizeData[String(b)] = {};
  for (const r of data.sightingSizes) {
    const cell = sizeData[String(bucketOf(r.size))];
    cell[String(r.year)] = (cell[String(r.year)] ?? 0) + r.count;
  }
  const sizeCats = BUCKETS.map((b) => ({ key: String(b), label: b === 10 ? '10+' : String(b) }));

  // 6. Tỉ lệ gặp theo tuyến.
  const transects = [...new Set(data.transectRates.map((r) => r.transect))];
  const rateData = {};
  for (const r of data.transectRates) (rateData[r.transect] ??= {})[String(r.year)] = r.rate === null ? 0 : Math.round(r.rate * 1000) / 1000;
  const rateCats = transects.map((t) => ({ key: t, label: t }));

  const tableOf = (cats, series, dataMap, digits) => ({
    head: ['', ...series.map((s) => s.label)],
    rows: cats.map((c) => [c.title ?? c.label, ...series.map((s) => fmtNum(dataMap[c.key]?.[s.key] ?? 0, digits))]),
  });

  return (
    <>
      <h2 className="charts-title">Biểu đồ</h2>
      <div className="charts">
        <ChartCard
          title="Bản ghi quan sát theo năm"
          legend={groupSeries}
          table={tableOf(yearCats, groupSeries, yearData)}
          note="Số bản ghi đã duyệt, chia theo nhóm loài. Phản ánh công sức khảo sát từng năm, không phải số lượng cá thể ngoài tự nhiên."
        >
          <ColumnChart label="Bản ghi quan sát theo năm và nhóm loài" categories={yearCats} series={groupSeries} data={yearData} mode="stack" />
        </ChartCard>

        <ChartCard
          title="Bản ghi theo tháng trong năm"
          table={tableOf(monthCats, [{ key: 'count', label: 'Bản ghi' }], monthData)}
          note="Trục ngang là tháng (1–12), gộp mọi năm. Các đỉnh cho thấy mùa vụ của các đợt khảo sát."
        >
          <ColumnChart label="Bản ghi theo tháng" categories={monthCats} series={[{ key: 'count', label: 'Bản ghi', color: 'var(--color-accent)' }]} data={monthData} />
        </ChartCard>

        <ChartCard title="Hạng bảo tồn IUCN của các loài" table={{ head: ['Hạng', 'Số loài'], rows: [...iucnRows.map((r) => [r.label, fmtNum(r.value)]), ['Chưa đánh giá', fmtNum(ne)]] }} note={`${fmtNum(ne)} loài khác chưa được đánh giá hạng IUCN nên không có trong biểu đồ.`}>
          <HBarChart rows={iucnRows} color="var(--color-accent)" />
        </ChartCard>

        <ChartCard title="Mười họ có nhiều loài nhất" table={{ head: ['Họ', 'Số loài'], rows: familyRows.map((r) => [r.label, fmtNum(r.value)]) }}>
          <HBarChart rows={familyRows} color="var(--series-a)" />
        </ChartCard>

        {surveyYears.length > 0 && (
          <ChartCard
            title="Cỡ đàn voọc trên tuyến"
            legend={sizeSeries}
            table={tableOf(sizeCats, sizeSeries, sizeData)}
            note="Số đàn theo số cá thể đếm được trong đàn (trục ngang). Đàn từ 10 cá thể trở lên gộp chung."
          >
            <ColumnChart label="Số đàn theo cỡ đàn" categories={sizeCats} series={sizeSeries} data={sizeData} unit=" đàn" />
          </ChartCard>
        )}

        {transects.length > 0 && (
          <ChartCard
            title="Tỉ lệ gặp đàn theo tuyến"
            legend={sizeSeries}
            table={tableOf(rateCats, sizeSeries, rateData, 3)}
            note="Số đàn gặp trên mỗi km đã đi (chiều dài tuyến × số ngày đi lặp), nên các tuyến dài ngắn khác nhau so sánh được."
          >
            <ColumnChart label="Tỉ lệ gặp đàn theo tuyến" categories={rateCats} series={sizeSeries} data={rateData} unit=" đàn/km" digits={2} />
          </ChartCard>
        )}
      </div>
    </>
  );
}

function Stat({ label, value, children }) {
  return (
    <div className="stat">
      <span className="stat__label">{label}</span>
      <span className="stat__value">{value === undefined ? <span className="skeleton" style={{ width: 64, height: 28 }} /> : fmtNum(value)}</span>
      <span className="stat__note">{children}</span>
    </div>
  );
}

function WorkItem({ to, count, label, hint }) {
  const done = count === 0;
  return (
    <li>
      <span className={`badge ${done ? 'badge--ok' : 'badge--warn'} num`}>
        <Icon name={done ? 'check' : 'flag'} size={12} />
        {count === undefined ? '…' : fmtNum(count)}
      </span>
      <span style={{ minWidth: 0 }}>
        <span className="cell-title">{label}</span>
        <div className="cell-sub">{hint}</div>
      </span>
      {!done && count !== undefined && (
        <Link to={to} className="btn btn--sm">
          Xử lý
        </Link>
      )}
    </li>
  );
}

const METRICS = [
  { key: 'groups', label: 'Số đàn gặp' },
  { key: 'individuals', label: 'Số cá thể đếm được' },
  { key: 'effortKm', label: 'Quãng đường khảo sát (km)', digits: 1 },
  { key: 'encounterRatePerKm', label: 'Tỉ lệ gặp (đàn/km)', digits: 3 },
  { key: 'meanGroupSize', label: 'Cỡ đàn trung bình', digits: 1 },
];

function SurveyCompare({ years }) {
  if (years.length === 0) return <Empty title="Chưa có dữ liệu khảo sát tuyến">Nhập file khảo sát ở mục Bộ dữ liệu.</Empty>;
  const shown = years.slice(-2);
  const [a, b] = shown.length === 2 ? shown : [null, shown[0]];
  return (
    <div className="compare">
      <div className="compare__row compare__row--head">
        <span>Chỉ số</span>
        <span>{a?.year ?? ''}</span>
        <span>{b.year}</span>
        <span>Thay đổi</span>
      </div>
      {METRICS.map((m) => {
        const va = a?.[m.key];
        const vb = b[m.key];
        const pct = va ? ((vb - va) / va) * 100 : null;
        return (
          <div className="compare__row" key={m.key}>
            <span>{m.label}</span>
            <span>{a ? fmtNum(va, m.digits) : ''}</span>
            <span>{fmtNum(vb, m.digits)}</span>
            <span className={pct === null || Math.abs(pct) < 0.5 ? 'muted' : pct > 0 ? 'delta-up' : 'delta-down'}>
              {pct === null ? '—' : `${pct > 0 ? '+' : pct < 0 ? '−' : ''}${fmtNum(Math.abs(pct), 0)} %`}
            </span>
          </div>
        );
      })}
      <p className="field__hint" style={{ marginTop: 'var(--space-sm)' }}>
        Số đếm trực tiếp trên tuyến (mỗi tuyến đi lặp nhiều ngày), không phải ước lượng quần thể.
      </p>
    </div>
  );
}

function GroupBars({ species }) {
  const totals = GROUPS.map((g) => ({
    ...g,
    records: species.filter((s) => s.group === g.value).reduce((n, s) => n + s._count.observations, 0),
    species: species.filter((s) => s.group === g.value).length,
  }));
  const max = Math.max(1, ...totals.map((t) => t.records));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
      <div className="hbar">
        {totals.map((t) => (
          <Bar key={t.value} t={t} max={max} />
        ))}
      </div>
      <p className="field__hint">Số trong ngoặc là số loài của nhóm có trong danh mục.</p>
    </div>
  );
}

function Bar({ t, max }) {
  return (
    <>
      <GroupLabel group={t.value} />
      <div className="hbar__track" title={`${t.label}: ${fmtNum(t.records)} bản ghi, ${fmtNum(t.species)} loài`}>
        <span className="hbar__fill" style={{ width: `${(t.records / max) * 100}%`, background: t.color }} />
      </div>
      <span className="hbar__value">
        {fmtNum(t.records)} <span className="faint">({fmtNum(t.species)})</span>
      </span>
    </>
  );
}
