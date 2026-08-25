const SITE = 'https://easternalignment.com';
const SITE_NAME = 'Eastern Alignment';

const websiteSchema = {"@context":"https://schema.org","@type":"WebSite","@id":SITE+"/#website","name":SITE_NAME,"alternateName":"Eastern Alignment Psychic Reviews","url":SITE,"description":"Honest, independently tested reviews.","inLanguage":"en-US","publisher":{"@id":SITE+"/#organization"}};
const organizationSchema = {"@context":"https://schema.org","@type":"Organization","@id":SITE+"/#organization","name":SITE_NAME,"alternateName":"Eastern Alignment Psychic Reviews","url":SITE,"logo":{"@type":"ImageObject","@id":SITE+"/#logo","url":SITE+"/logo.jpg","width":1024,"height":817},"image":SITE+"/logo.jpg","description":"Independent review site."};
const personSchema = {"@context":"https://schema.org","@type":"Person","@id":SITE+"/#sarah","name":"Sarah","url":SITE+"/about/","jobTitle":"Reviewer & Researcher","worksFor":{"@id":SITE+"/#organization"}};

function buildWebApplication(input){return {"@type":"WebApplication","@id":input.url+"#webapp","name":input.name,"url":input.url,"applicationCategory":"LifestyleApplication","applicationSubCategory":"Spiritual & Astrology Tools","operatingSystem":"Web","browserRequirements":"Requires a modern HTML5 browser and JavaScript.","offers":{"@type":"Offer","price":"0","priceCurrency":"USD"},"description":input.description,"publisher":{"@id":SITE+"/#organization"},"author":{"@id":SITE+"/#sarah"}};}

const canonical = SITE + "/guides/how-to-choose/";
const articleSchema = {"@context":"https://schema.org","@type":"Article","@id":canonical+"#article","headline":"How to Choose","author":{"@type":"Person","@id":SITE+"/#sarah","name":"Sarah","url":SITE+"/about/","jobTitle":"Reviewer & Researcher"},"publisher":{"@id":SITE+"/#organization"},"datePublished":"2026-01-01","image":"/og-default.jpg","articleSection":"Guides","mainEntityOfPage":{"@type":"WebPage","@id":canonical},"speakable":{"@type":"SpeakableSpecification","cssSelector":["h1",".article-content"]}};

const SITE_URL = SITE; const currentPath = "/guides/how-to-choose/";
const crumbs = [{label:"Home",href:"/"},{label:"Guides",href:"/guides/"},{label:"How to Choose"}];
const breadcrumbSchema = {"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":crumbs.map((it,i)=>({"@type":"ListItem","position":i+1,"name":it.label,"item":SITE_URL+(it.href??currentPath)}))};

const toolSchema = {"@context":"https://schema.org","@graph":[buildWebApplication({name:"Moon Phase Tracker",url:SITE+"/tools/moon-phase/",description:"Free moon phase tracker."}),{"@type":"FAQPage","mainEntity":[{"@type":"Question","name":"q","acceptedAnswer":{"@type":"Answer","text":"a"}}]}]};

[websiteSchema,organizationSchema,personSchema,articleSchema,breadcrumbSchema,toolSchema].forEach((s)=>{ JSON.stringify(s); });
console.log("All 6 top-level schemas serialize to valid JSON: OK");

const declared = new Set();
const refs = [];
function walk(o){ if(!o || typeof o !== "object") return; if(o["@id"] && o["@type"]) declared.add(o["@id"]); for(const k in o){ const v=o[k]; if(v && typeof v==="object"){ if(v["@id"] && String(v["@id"]).startsWith(SITE+"/#") && v["@type"]) declared.add(v["@id"]); if((k==="publisher"||k==="author"||k==="worksFor") && v["@id"]) refs.push(v["@id"]); walk(v); } } }
walk(websiteSchema); walk(organizationSchema); walk(personSchema); walk(articleSchema); walk(toolSchema);
const missing = refs.filter(r=>!declared.has(r));
console.log("Declared @ids:", [...declared].map(x=>x.replace(SITE,"")).join(", "));
console.log("Referenced (publisher/author/worksFor):", refs.map(x=>x.replace(SITE,"")).join(", "));
console.log(missing.length===0 ? "@id linkage consistent: OK" : "MISSING -> "+missing.join(", "));

const last = breadcrumbSchema.itemListElement[breadcrumbSchema.itemListElement.length-1];
console.log("Breadcrumb last item URL:", !!last.item, "->", last.item);

const wa = buildWebApplication({name:"x",url:SITE+"/tools/x/",description:"d"});
console.log("WebApplication node has own @context (should be false):", ("@context" in wa));
