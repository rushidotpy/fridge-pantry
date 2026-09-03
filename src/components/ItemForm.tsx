import { Camera, ImagePlus, Loader2, ScanLine, Sparkles, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { formatDate, plusDaysIso, todayIso } from '../lib/dates'
import { compressImage } from '../lib/image'
import { canScan, scanLabel, type ScanResult } from '../lib/scan'
import { CATEGORIES, CATEGORY_EMOJI, LOCATIONS, UNITS, newId, type Category, type Item, type Location } from '../lib/types'
import { useData, type ItemInput } from '../state/DataProvider'
import { Button, Field, Segmented, Sheet, cx, inputCls } from './ui'

interface Props {
  open: boolean
  onClose: () => void
  item?: Item | null
  defaultLocation?: Location
  /** Prefill fields (e.g. from the shopping list). */
  preset?: Partial<ItemInput>
  onSaved?: (item: Item) => void
}

const QUICK_DATES: { label: string; days: number }[] = [
  { label: '3d', days: 3 },
  { label: '1w', days: 7 },
  { label: '2w', days: 14 },
  { label: '1mo', days: 30 },
  { label: '3mo', days: 90 },
  { label: '6mo', days: 180 },
]

export function ItemForm({ open, onClose, item, defaultLocation = 'fridge', preset, onSaved }: Props) {
  const { addItem, updateItem, removeItem, uploadPhoto, isStaple, addStaple, removeStaple } = useData()
  const editing = Boolean(item)

  const [name, setName] = useState('')
  const [location, setLocation] = useState<Location>(defaultLocation)
  const [category, setCategory] = useState<Category>('other')
  const [quantity, setQuantity] = useState(1)
  const [unit, setUnit] = useState('pcs')
  const [expires, setExpires] = useState<string>('')
  const [dateKind, setDateKind] = useState<Item['date_kind']>(null)
  const [notes, setNotes] = useState('')
  const [staple, setStaple] = useState(false)

  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [scan, setScan] = useState<ScanResult | null>(null)
  const [scanErr, setScanErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const idRef = useRef(newId())
  // Latest props, read only when the sheet opens so parent re-renders don't clobber edits.
  const initRef = useRef({ item, preset, defaultLocation })
  initRef.current = { item, preset, defaultLocation }

  useEffect(() => {
    if (!open) return
    const { item, preset, defaultLocation } = initRef.current
    idRef.current = item?.id ?? newId()
    setName(item?.name ?? preset?.name ?? '')
    setLocation(item?.location ?? preset?.location ?? defaultLocation)
    setCategory(item?.category ?? preset?.category ?? 'other')
    setQuantity(item?.quantity ?? preset?.quantity ?? 1)
    setUnit(item?.unit ?? preset?.unit ?? 'pcs')
    setExpires(item?.expires_on ?? preset?.expires_on ?? '')
    setDateKind(item?.date_kind ?? null)
    setNotes(item?.notes ?? '')
    setStaple(Boolean(isStaple(item?.name ?? preset?.name ?? '')))
    setPhotoBlob(null)
    setPhotoPreview(item?.photo_url ?? null)
    setScan(null)
    setScanErr(null)
  }, [open, item?.id, isStaple])

  async function onPickPhoto(file: File | undefined) {
    if (!file) return
    setScanErr(null)
    const blob = await compressImage(file)
    setPhotoBlob(blob)
    setPhotoPreview(URL.createObjectURL(blob))
    if (canScan()) void runScan(blob)
  }

  async function runScan(blob: Blob) {
    setScanning(true)
    setScanErr(null)
    try {
      const result = await scanLabel(blob)
      setScan(result)
      applyScan(result)
    } catch (e) {
      setScanErr(e instanceof Error ? e.message : String(e))
    } finally {
      setScanning(false)
    }
  }

  function applyScan(r: ScanResult) {
    if (r.name && !name.trim()) setName(r.name)
    if (r.category) setCategory(r.category)
    if (r.expires_on) setExpires(r.expires_on)
    if (r.date_kind) setDateKind(r.date_kind)
    if (r.category === 'frozen') setLocation('freezer')
  }

  async function save() {
    if (!name.trim()) return
    setSaving(true)
    try {
      let photo_url = item?.photo_url ?? null
      if (photoBlob) photo_url = await uploadPhoto(photoBlob, idRef.current)
      const payload = {
        name: name.trim(),
        location,
        category,
        quantity,
        unit,
        expires_on: expires || null,
        date_kind: expires ? dateKind : null,
        notes: notes.trim() || null,
        photo_url,
      }
      let saved: Item
      if (item) {
        await updateItem(item.id, payload)
        saved = { ...item, ...payload, updated_at: new Date().toISOString() }
      } else {
        saved = await addItem(payload)
      }

      const existing = isStaple(name)
      if (staple && !existing) await addStaple({ name: name.trim(), category, unit, target_quantity: 1 })
      if (!staple && existing) await removeStaple(existing.id)
      onSaved?.(saved)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  async function del() {
    if (!item) return
    if (!confirm(`Delete ${item.name}?`)) return
    await removeItem(item.id)
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editing ? 'Edit item' : 'Add item'}
      footer={
        <div className="flex gap-2">
          {editing && (
            <Button variant="danger" onClick={del} aria-label="Delete" className="px-3">
              <Trash2 className="size-4" />
            </Button>
          )}
          <Button onClick={save} disabled={!name.trim() || saving} className="flex-1">
            {saving ? <Loader2 className="size-4 animate-spin" /> : editing ? 'Save changes' : 'Add to inventory'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Photo + scan */}
        <div className="flex gap-3">
          <div
            className="relative grid size-24 shrink-0 place-items-center overflow-hidden rounded-2xl bg-slate-100 text-3xl dark:bg-slate-800"
            onClick={() => cameraRef.current?.click()}
          >
            {photoPreview ? (
              <img src={photoPreview} alt="" className="size-full object-cover" />
            ) : (
              <span>{CATEGORY_EMOJI[category]}</span>
            )}
            {scanning && (
              <div className="absolute inset-0 grid place-items-center bg-black/40 text-white">
                <ScanLine className="size-6 animate-pulse" />
              </div>
            )}
          </div>
          <div className="flex flex-1 flex-col justify-center gap-2">
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => cameraRef.current?.click()} className="flex-1">
                <Camera className="size-4" /> Camera
              </Button>
              <Button variant="secondary" onClick={() => fileRef.current?.click()} className="flex-1">
                <ImagePlus className="size-4" /> Photo
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              {canScan()
                ? 'Snap the label and the expiration date is read automatically.'
                : 'Add a Gemini key in Settings to read dates from photos.'}
            </p>
            {photoBlob && canScan() && !scanning && (
              <button
                type="button"
                onClick={() => runScan(photoBlob)}
                className="self-start text-xs font-medium text-brand-700 hover:underline"
              >
                Re-scan label
              </button>
            )}
          </div>
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => onPickPhoto(e.target.files?.[0])}
          />
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPickPhoto(e.target.files?.[0])} />
        </div>

        {scan && (
          <div
            className={cx(
              'flex items-start gap-2 rounded-xl px-3 py-2 text-xs ring-1',
              scan.confidence === 'high'
                ? 'bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:ring-emerald-900'
                : scan.confidence === 'medium'
                  ? 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-900'
                  : 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
            )}
          >
            <Sparkles className="mt-0.5 size-3.5 shrink-0" />
            <div>
              {scan.expires_on ? (
                <>
                  Read <strong>{scan.raw_date_text ?? formatDate(scan.expires_on, 'MMM d, yyyy')}</strong> as{' '}
                  <strong>{formatDate(scan.expires_on, 'MMM d, yyyy')}</strong>
                  {scan.name ? ` for ${scan.name}` : ''} ({scan.confidence} confidence).{' '}
                  {scan.confidence !== 'high' && 'Double-check the date below.'}
                </>
              ) : (
                <>No date found on the label{scan.name ? `, but it looks like ${scan.name}` : ''}. Set one below.</>
              )}
            </div>
          </div>
        )}
        {scanErr && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-200">{scanErr}</p>}

        <Field label="Name">
          <input
            className={inputCls}
            placeholder="e.g. Whole milk"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus={!editing && !preset?.name}
            enterKeyHint="done"
          />
        </Field>

        <Field label="Where">
          <Segmented value={location} onChange={setLocation} options={LOCATIONS} />
        </Field>

        <div className="grid grid-cols-[1fr_auto] gap-3">
          <Field label="Quantity">
            <div className="flex items-stretch overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
              <button type="button" className="px-4 text-lg" onClick={() => setQuantity((q) => Math.max(0, +(q - 1).toFixed(2)))}>
                −
              </button>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full bg-transparent py-2.5 text-center outline-none"
              />
              <button type="button" className="px-4 text-lg" onClick={() => setQuantity((q) => +(q + 1).toFixed(2))}>
                +
              </button>
            </div>
          </Field>
          <Field label="Unit">
            <select className={cx(inputCls, 'w-28')} value={unit} onChange={(e) => setUnit(e.target.value)}>
              {UNITS.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Category">
          <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value as Category)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_EMOJI[c]} {c[0].toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Expiration date">
          <input type="date" className={inputCls} value={expires} min="2000-01-01" onChange={(e) => setExpires(e.target.value)} />
          <div className="mt-2 flex flex-wrap gap-1.5">
            <QuickChip active={expires === todayIso()} onClick={() => setExpires(todayIso())}>
              Today
            </QuickChip>
            {QUICK_DATES.map((q) => (
              <QuickChip key={q.days} active={expires === plusDaysIso(q.days)} onClick={() => setExpires(plusDaysIso(q.days))}>
                +{q.label}
              </QuickChip>
            ))}
            {expires && (
              <QuickChip onClick={() => setExpires('')}>Clear</QuickChip>
            )}
          </div>
          {expires && (
            <div className="mt-2">
              <Segmented
                size="sm"
                value={dateKind ?? 'unknown'}
                onChange={(v) => setDateKind(v === 'unknown' ? null : (v as Item['date_kind']))}
                options={[
                  { id: 'use_by', label: 'Use by' },
                  { id: 'best_before', label: 'Best before' },
                  { id: 'unknown', label: 'Not sure' },
                ]}
              />
              {dateKind === 'best_before' && (
                <p className="mt-1 text-xs text-slate-400">Best-before is about quality; food is often fine for a while after.</p>
              )}
            </div>
          )}
        </Field>

        <Field label="Notes">
          <input className={inputCls} placeholder="Opened, half left, brand…" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        <label className="flex items-center justify-between rounded-xl bg-slate-100 px-3.5 py-3 dark:bg-slate-800">
          <div>
            <div className="text-sm font-medium">Always keep stocked</div>
            <div className="text-xs text-slate-500">Adds to your favorites and to the shopping list when it runs out.</div>
          </div>
          <input type="checkbox" checked={staple} onChange={(e) => setStaple(e.target.checked)} className="size-5 accent-brand-700" />
        </label>
      </div>
    </Sheet>
  )
}

function QuickChip({ children, onClick, active }: { children: React.ReactNode; onClick: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'rounded-full px-2.5 py-1 text-xs font-medium transition',
        active
          ? 'bg-brand-700 text-white'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
      )}
    >
      {children}
    </button>
  )
}
