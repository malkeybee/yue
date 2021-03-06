#!/usr/bin/env node

// Copyright 2016 Cheng Zhao. All rights reserved.
// Use of this source code is governed by the license that can be found in the
// LICENSE file.

const {targetCpu, targetOs, execSync, spawnSync} = require('./common')

// Get the arch of sysroot.
let sysrootArch = {
  x64: 'amd64',
  x86: 'i386',
  arm: 'arm',
  arm64: 'arm64',
}[targetCpu]

if (process.platform != 'win32') {
  execSync('python building/tools/update-clang.py')
}
if (process.platform == 'linux') {
  execSync(`python building/tools/install-sysroot.py --arch ${sysrootArch}`)
}

execSync('git submodule sync --recursive')
execSync('git submodule update --init --recursive')
execSync('node scripts/download_gn.js')
execSync(`node scripts/download_node_headers.js node ${process.version} ${targetCpu}`)

const commonConfig = [
  'fatal_linker_warnings=false',
  `target_cpu="${targetCpu}"`,
  'node_runtime="node"',
  `node_version="${process.version}"`,
]
const componentConfig = [
  'is_component_build=true',
  'is_debug=true',
  'use_sysroot=false',
]
const debugConfig = [
  'is_component_build=false',
  'is_debug=true',
  'use_sysroot=true',
]
const releaseConfig = [
  'is_component_build=false',
  'is_debug=false',
  'use_sysroot=true',
]

if (targetOs != 'win') {
  // Don't set official build for Windows, which increases the size of libyue.
  releaseConfig.push('is_official_build=true')

  // Use our custom clang script.
  commonConfig.push('is_clang=true',
                    'clang_update_script="//building/tools/update-clang.py"')
}

if (targetOs == 'mac') {
  commonConfig.push('mac_deployment_target="10.9.0"',
                    'mac_sdk_min="10.12"',
                    'use_xcode_clang=false')
}

if (targetOs == 'linux') {
  // Use custom sysroot.
  commonConfig.push('target_sysroot_dir="//third_party/"')
  // This flag caused weird compilation errors when building on Linux.
  debugConfig.push('enable_iterator_debugging=false')
}

gen('out/Component', componentConfig)
gen('out/Debug', debugConfig)
gen('out/Release', releaseConfig)

function gen(dir, args) {
  spawnSync('gn', ['gen', dir, `--args=${commonConfig.concat(args).join(' ')}`])
}
