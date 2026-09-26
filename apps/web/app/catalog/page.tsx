'use client';

import { useMemo, useState } from 'react';
import styles from './catalog.module.css';
import ProductWorkspace from './product-workspace';

type Product = { id: string; sku: string; name: string; category: string; manufacturer: string; barcodes: string[]; unit: string; status: 'Active' | 'Inactive' };
const initialProducts: Product[] = [
  { id: '1', sku: 'MILK-001', name: 'Whole Milk 1L', category: 'Dairy', manufacturer: 'Example Dairy', barcodes: ['5901234123457'], unit: 'Each', status: 'Active' },
  { id: '2', sku: 'BREAD-001', name: 'Sourdough Bread', category: 'Bakery', manufacturer: 'Example Bakery', barcodes: ['5012345678900'], unit: 'Each', status: 'Active' },
  { id: '3', sku: 'APPLE-001', name: 'Fresh Apples', category: 'Produce', manufacturer: 'Example Growers', barcodes: ['2000000000015'], unit: 'Kg', status: 'Active' },
];
type Tab = 'Products' | 'Categories' | 'Manufacturers';
export default function CatalogPage() {
  const [tab, setTab] = useState<Tab>('Products');
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [categories, setCategories] = useState(['Dairy', 'Bakery', 'Produce']);
  const [manufacturers, setManufacturers] = useState(['Example Dairy', 'Example Bakery', 'Example Growers']);
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [extraBarcodes, setExtraBarcodes] = useState('');
  const [category, setCategory] = useState('Dairy');
  const [manufacturer, setManufacturer] = useState('Example Dairy');
  const [unit, setUnit] = useState('Each');
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const visible = useMemo(() => products.filter(p => (categoryFilter === 'All' || p.category === categoryFilter) && [p.name, p.sku, ...p.barcodes, p.category, p.manufacturer].some(v => v.toLowerCase().includes(search.toLowerCase()))), [products, search, categoryFilter]);
  const pageSize = 50;
  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageItems = visible.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  function beginEdit(p: Product) {
    setEditingProduct(p.id); setName(p.name); setSku(p.sku); setBarcode(p.barcodes[0] || '');
    setExtraBarcodes(p.barcodes.slice(1).join(', ')); setCategory(p.category);
    setManufacturer(p.manufacturer); setUnit(p.unit); setError(''); setShowForm(true); setSelectedProduct(null);
  }
  function addProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !sku.trim()) { setError('Product name and SKU are required.'); return; }
    if (editingProduct && products.find(p => p.id === editingProduct)?.sku !== sku.trim()) { setError('Item Code cannot be changed through ordinary editing.'); return; }
    if (products.some(p => p.id !== editingProduct && p.sku.toLowerCase() === sku.trim().toLowerCase())) { setError('Item code / SKU already exists.'); return; }
    const codes = [barcode, ...extraBarcodes.split(/[\s,;]+/)].map(v => v.trim()).filter(Boolean);
    if (new Set(codes).size !== codes.length || products.some(p => p.id !== editingProduct && p.barcodes.some(b => codes.includes(b)))) { setError('Barcode already belongs to an item.'); return; }
    if (editingProduct) {
      setProducts(current => current.map(p => p.id === editingProduct ? {...p, name: name.trim(), sku: sku.trim(), barcodes: codes, category, manufacturer, unit} : p));
      setSelectedProduct(editingProduct);
    } else {
      const id = crypto.randomUUID();
      setProducts(current => [...current, { id, name: name.trim(), sku: sku.trim(), barcodes: codes, category, manufacturer, unit, status: 'Active' }]);
      setSelectedProduct(id);
    }
    setEditingProduct(null);
    setName(''); setSku(''); setBarcode(''); setExtraBarcodes(''); setError(''); setShowForm(false);
  }
  function addMaster(e: React.FormEvent) {
    e.preventDefault();
    const value = newName.trim();
    if (!value) return;
    const existing = tab === 'Categories' ? categories : manufacturers;
    if (existing.some(v => v.toLowerCase() === value.toLowerCase())) { setError('This name already exists.'); return; }
    if (tab === 'Categories') { setCategories(current => [...current, value]); if (!category) setCategory(value); }
    else { setManufacturers(current => [...current, value]); if (!manufacturer) setManufacturer(value); }
    setNewName(''); setError('');
  }
  return <div className={styles.shell}>
    <aside className={styles.sidebar}><div className={styles.brand}>◈ OmniCore <small>RETAIL OPERATIONS</small></div><div className={styles.navTitle}>WORKSPACE</div><a href="/" className={styles.nav}>Overview</a><a href="/catalog" className={styles.active}>▦ Product Catalogue</a><div className={styles.navTitle}>COMING NEXT</div><span className={styles.navMuted}>Inventory</span><span className={styles.navMuted}>Suppliers</span><span className={styles.navMuted}>Deliveries</span><span className={styles.navMuted}>Ordering</span></aside>
    <main className={styles.main}><header className={styles.header}><div><span className={styles.eyebrow}>MASTER DATA / CATALOGUE</span><h1>Product Catalogue</h1><p>Find items instantly by item code, barcode or name. Manage one item with multiple barcodes.</p></div><span className={styles.demo}>DEMO · NOT SAVED</span></header>
    <section className={styles.stats}><div><span>Total products</span><strong>{products.length}</strong></div><div><span>Active products</span><strong>{products.filter(p => p.status === 'Active').length}</strong></div><div><span>Categories</span><strong>{categories.length}</strong></div><div><span>Manufacturers</span><strong>{manufacturers.length}</strong></div></section>
    <section className={styles.panel}><div className={styles.toolbar}><div className={styles.tabs}>{(['Products','Categories','Manufacturers'] as Tab[]).map(t => <button key={t} className={tab === t ? styles.selected : ''} onClick={() => {setTab(t);setError('');setShowForm(false);}}>{t}</button>)}</div>{tab === 'Products' && <button className={styles.primary} onClick={() => {setEditingProduct(null);setName('');setSku('');setBarcode('');setExtraBarcodes('');setError('');setShowForm(v => !v);}}>{showForm ? 'Cancel' : '+ Add product'}</button>}</div>
    {tab === 'Products' && <><div className={styles.catalogControls}><input className={styles.search} aria-label="Search products" placeholder="Search item code, barcode or product name..." value={search} onChange={e => {setSearch(e.target.value);setPage(1);setSelectedProduct(null);}} /><select className={styles.categoryFilter} aria-label="Filter category" value={categoryFilter} onChange={e => {setCategoryFilter(e.target.value);setPage(1);}}><option>All</option>{categories.map(c => <option key={c}>{c}</option>)}</select></div><div className={styles.resultSummary}>{visible.length} items · Showing {visible.length ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, visible.length)} <span>DEMO</span></div>
      {showForm && <form className={styles.form} onSubmit={addProduct}><h3>{editingProduct ? 'Edit product' : 'New product'}</h3><div className={styles.fields}><label>Product name *<input value={name} onChange={e => setName(e.target.value)} /></label><label>Item code (SKU) *<input value={sku} onChange={e => setSku(e.target.value)} readOnly={Boolean(editingProduct)} aria-describedby={editingProduct ? 'immutable-item-code' : undefined} />{editingProduct && <small id="immutable-item-code">Item Code is immutable. A controlled migration is required to change it.</small>}</label><label>Primary barcode<input value={barcode} onChange={e => setBarcode(e.target.value)} /></label><label>Additional barcodes (comma separated)<input value={extraBarcodes} onChange={e => setExtraBarcodes(e.target.value)} /></label><label>Category<select value={category} onChange={e => setCategory(e.target.value)}>{categories.map(v => <option key={v}>{v}</option>)}</select></label><label>Manufacturer<select value={manufacturer} onChange={e => setManufacturer(e.target.value)}>{manufacturers.map(v => <option key={v}>{v}</option>)}</select></label><label>Unit<select value={unit} onChange={e => setUnit(e.target.value)}><option>Each</option><option>Kg</option><option>Litre</option></select></label></div>{error && <p role="alert" className={styles.error}>{error}</p>}<button className={styles.primary} type="submit">{editingProduct ? 'Save demo changes' : 'Add to demo catalogue'}</button></form>}
      <div className={styles.workbench}><div className={styles.listPane}><div className={styles.listPaneTitle}><strong>ITEMS</strong><span>{visible.length} matching</span></div>
      <div className={styles.compactList} aria-label="Compact product list">{pageItems.map(p => <div className={styles.compactItem} key={p.id}><button type="button" className={styles.compactRow} aria-expanded={selectedProduct === p.id} onClick={() => setSelectedProduct(selectedProduct === p.id ? null : p.id)}><span className={styles.compactIdentity}><small>#{p.sku}</small><strong>{p.name}</strong><small>{p.category} · {p.barcodes.length} {p.barcodes.length === 1 ? "barcode" : "barcodes"}</small></span><span className={styles.compactEnd}><span className={styles.compactStatus}>{p.status}</span><span aria-hidden="true">›</span></span></button>{selectedProduct === p.id && <div className={styles.compactBarcodes} aria-label={'Barcodes for '+p.name}>{p.barcodes.length ? p.barcodes.map(b => <span key={b}>{b}</span>) : <span>No barcodes</span>}</div>}</div>)}{visible.length === 0 && <p className={styles.empty}>No products match your search.</p>}</div><div className={styles.pagination}><button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button><span>Page {currentPage} of {pageCount}</span><button disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>Next</button></div>
      <div className={styles.tableWrap}><table><thead><tr><th>PRODUCT</th><th>ITEM CODE / BARCODES</th><th>CATEGORY</th><th>MANUFACTURER</th><th>UNIT</th><th>STATUS</th></tr></thead><tbody>{pageItems.map(p => <tr key={p.id}><td><button type="button" className={styles.productLink} onClick={() => setSelectedProduct(selectedProduct === p.id ? null : p.id)} aria-label={'Open product '+p.name}><b>{p.name}</b></button></td><td>{p.sku}<small>{p.barcodes.length} barcode(s)</small></td><td>{p.category}</td><td>{p.manufacturer}</td><td>{p.unit}</td><td><span className={styles.status}>{p.status}</span></td></tr>)}</tbody></table>{visible.length === 0 && <p className={styles.empty}>No products match your search.</p>}</div></div><div className={selectedProduct ? styles.detailPane : styles.detailPaneEmpty}>{selectedProduct && products.find(p => p.id === selectedProduct) ? <ProductWorkspace key={selectedProduct} product={products.find(p => p.id === selectedProduct)!} onClose={() => setSelectedProduct(null)} onEdit={() => beginEdit(products.find(p => p.id === selectedProduct)!)} /> : <div className={styles.selectHint}>Select an item to view its maintenance workspace</div>}</div></div></>}
    {tab !== 'Products' && <><form className={styles.masterForm} onSubmit={addMaster}><input aria-label={tab === 'Categories' ? 'New category name' : 'New manufacturer name'} placeholder={tab === 'Categories' ? 'New category name' : 'New manufacturer name'} value={newName} onChange={e => setNewName(e.target.value)} /><button className={styles.primary}>+ Add {tab === 'Categories' ? 'category' : 'manufacturer'}</button></form>{error && <p role="alert" className={styles.error}>{error}</p>}<div className={styles.masterList}>{(tab === 'Categories' ? categories : manufacturers).map(v => <div key={v}><strong>{v}</strong><span>{products.filter(p => tab === 'Categories' ? p.category === v : p.manufacturer === v).length} products</span></div>)}</div></>}
    </section><nav className={styles.mobileNav} aria-label="Mobile navigation"><a href="/" aria-label="Home"><span aria-hidden="true">⌂</span>Home</a><a href="/catalog" aria-current="page" aria-label="Products"><span aria-hidden="true">▦</span>Products</a><span aria-disabled="true" title="Scanner coming soon"><span aria-hidden="true">▣</span>Scan</span><span aria-disabled="true" title="Tasks coming soon"><span aria-hidden="true">☷</span>Tasks</span><span aria-disabled="true" title="More coming soon"><span aria-hidden="true">•••</span>More</span></nav><p className={styles.footnote}>Prototype only. Changes are held in this browser session and are not connected to the API or database.</p></main></div>;
}
