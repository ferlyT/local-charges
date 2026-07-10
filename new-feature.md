buatkan plan agar :

pastikan pada saat formpage diinput tidak diijinkan duplikat no listcode atau no inputan. No inputan adalah mandatory.

tambahkan pada form fdDirequest, fdBilling, fdAR data diambil dari tbEmployees dari SEJDB2020 ( SELECT fdEmpName, fdEmpTitle from tbEmployees where fdStatus = 1)

fdDirequest -> WHERE fdEmpTitle = 'CSO' or 'SHIPMENT'
fdBilling -> WHERE fdEmpTitle = 'BILLING' 
fdAR -> WHERE fdEmpTitle = 'FINANCE' 

 pada saat menginput pada [FormPage.tsx](file;file:///c%3A/project-vibe-coding/local-charges/frontend/src/pages/FormPage.tsx)  dari [LocalChargesPage.tsx](file;file:///c%3A/project-vibe-coding/local-charges/frontend/src/pages/LocalChargesPage.tsx)  menggunakan Step-by-Step Form. user input -> listcode/ no inputan setelah validasi maka akan diarahkan untuk upload lampiran. jika sudah selesai upload lampiran maka akan diarahkan untuk ke halaman list.

buat fitur untuk menarik no invoice dari data local charges dengan requery fdlistcoode. dan buatkan dialog terkait dengan hasilnya. apabila ada no invoice makan status naik jadi done. dan role nya.
