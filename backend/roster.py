WIKI = "https://deadbydaylight.wiki.gg/images/"

_KILLERS = [
    ("k_trapper", "The Trapper", "K01"), ("k_wraith", "The Wraith", "K02"), ("k_hillbilly", "The Hillbilly", "K03"),
    ("k_nurse", "The Nurse", "K04"), ("k_hag", "The Hag", "K05"), ("k_shape", "The Shape", "K06"),
    ("k_doctor", "The Doctor", "K07"), ("k_huntress", "The Huntress", "K08"), ("k_cannibal", "The Cannibal", "K09"),
    ("k_nightmare", "The Nightmare", "K10"), ("k_pig", "The Pig", "K11"), ("k_clown", "The Clown", "K12"),
    ("k_spirit", "The Spirit", "K13"), ("k_legion", "The Legion", "K14"), ("k_plague", "The Plague", "K15"),
    ("k_ghostface", "The Ghost Face", "K16"), ("k_demogorgon", "The Demogorgon", "K17"), ("k_oni", "The Oni", "K18"),
    ("k_deathslinger", "The Deathslinger", "K19"), ("k_executioner", "The Executioner", "K20"),
    ("k_blight", "The Blight", "K21"), ("k_twins", "The Twins", "K22"), ("k_trickster", "The Trickster", "K23"),
    ("k_nemesis", "The Nemesis", "K24"), ("k_cenobite", "The Cenobite", "K25"), ("k_artist", "The Artist", "K26"),
    ("k_onryo", "The Onryō", "K27"), ("k_dredge", "The Dredge", "K28"), ("k_mastermind", "The Mastermind", "K29"),
    ("k_knight", "The Knight", "K30"), ("k_skullmerchant", "The Skull Merchant", "K31"),
    ("k_singularity", "The Singularity", "K32"), ("k_xenomorph", "The Xenomorph", "K33"),
    ("k_goodguy", "The Good Guy", "K34"), ("k_unknown", "The Unknown", "K35"), ("k_lich", "The Lich", "K36"),
    ("k_darklord", "The Dark Lord", None), ("k_houndmaster", "The Houndmaster", None), ("k_ghoul", "The Ghoul", None),
    ("k_animatronic", "The Animatronic", None), ("k_krasue", "The Krasue", None), ("k_first", "The First", None),
]

_SURVIVORS = [
    ("s_dwight", "Dwight Fairfield", "S01"), ("s_meg", "Meg Thomas", "S02"), ("s_claudette", "Claudette Morel", "S03"),
    ("s_jake", "Jake Park", "S04"), ("s_nea", "Nea Karlsson", "S05"), ("s_laurie", "Laurie Strode", "S06"),
    ("s_ace", "Ace Visconti", "S07"), ("s_bill", "Bill Overbeck", "S08"), ("s_feng", "Feng Min", "S09"),
    ("s_david", "David King", "S10"), ("s_quentin", "Quentin Smith", "S11"), ("s_tapp", "Detective Tapp", "S12"),
    ("s_kate", "Kate Denson", "S13"), ("s_adam", "Adam Francis", "S14"), ("s_jeff", "Jeff Johansen", "S15"),
    ("s_jane", "Jane Romero", "S16"), ("s_ash", "Ash Williams", "S17"), ("s_nancy", "Nancy Wheeler", "S18"),
    ("s_steve", "Steve Harrington", "S19"), ("s_yui", "Yui Kimura", "S20"), ("s_zarina", "Zarina Kassir", "S21"),
    ("s_cheryl", "Cheryl Mason", "S22"), ("s_felix", "Felix Richter", "S23"), ("s_elodie", "Élodie Rakoto", "S24"),
    ("s_yunjin", "Yun-Jin Lee", "S25"), ("s_jill", "Jill Valentine", "S26"), ("s_leon", "Leon S. Kennedy", "S27"),
    ("s_mikaela", "Mikaela Reid", "S28"), ("s_jonah", "Jonah Vasquez", "S29"), ("s_yoichi", "Yoichi Asakawa", "S30"),
    ("s_haddie", "Haddie Kaur", "S31"), ("s_ada", "Ada Wong", "S32"), ("s_rebecca", "Rebecca Chambers", "S33"),
    ("s_vittorio", "Vittorio Toscano", "S34"), ("s_thalita", "Thalita Lyra", "S35"), ("s_renato", "Renato Lyra", "S36"),
    ("s_gabriel", "Gabriel Soma", "S37"), ("s_nicolas", "Nicolas Cage", "S38"), ("s_ripley", "Ellen Ripley", "S39"),
    ("s_alan", "Alan Wake", "S40"), ("s_sable", "Sable Ward", "S41"), ("s_aestri", "Aestri Yazar", "S42"),
    ("s_lara", "Lara Croft", None), ("s_trevor", "Trevor Belmont", None), ("s_taurie", "Taurie Cain", None),
    ("s_orela", "Orela Rose", None), ("s_rick", "Rick Grimes", None), ("s_michonne", "Michonne Grimes", None),
]


def _build(rows, role):
    return [
        {"id": cid, "name": name, "role": role, "image": f"{WIKI}{code}_charSelect_portrait.png" if code else None}
        for cid, name, code in rows
    ]


KILLERS = _build(_KILLERS, "killer")
SURVIVORS = _build(_SURVIVORS, "survivor")
CHARACTERS = {c["id"]: c for c in KILLERS + SURVIVORS}
