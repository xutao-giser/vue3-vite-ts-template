<template>
  <div class="h-screen">
    <Map></Map>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import Map from '@/components/Map.vue'
export default defineComponent({
  name: 'Home',
  components:{
    Map
  }
});
</script>
<style scoped lang="less"></style>
